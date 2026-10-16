using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;

namespace InternshipOS.Server;

static class Program
{
    static string Safe(string? name)
    {
        if (string.IsNullOrEmpty(name)) return "unnamed";
        var bad = Path.GetInvalidFileNameChars();
        var sb = new StringBuilder();
        foreach (var ch in name)
            sb.Append(Array.IndexOf(bad, ch) >= 0 ? '_' : ch);
        return sb.ToString();
    }

    static string FindRoot()
    {
        var candidates = new[]
        {
            AppContext.BaseDirectory,
            Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..")),
            Directory.GetCurrentDirectory(),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), ".."))
        };
        foreach (var c in candidates)
            if (Directory.Exists(Path.Combine(c, "app")))
                return c;
        return Directory.GetCurrentDirectory();
    }

    static WebApplication BuildAndStartServer()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:8977");
        builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 200L * 1024 * 1024);
        builder.Services.Configure<FormOptions>(o =>
        {
            o.MultipartBodyLengthLimit = 200L * 1024 * 1024;
            o.ValueLengthLimit = 200 * 1024 * 1024;
        });
        builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
            p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));
        builder.Logging.ClearProviders();

        var app = builder.Build();
        app.UseCors();

        var rootDir = FindRoot();
        var appDir = Path.Combine(rootDir, "app");
        var dataDir = Path.Combine(rootDir, "data");
        var attachDir = Path.Combine(dataDir, "attachments");
        var stateFile = Path.Combine(dataDir, "state.js");

        Directory.CreateDirectory(dataDir);
        Directory.CreateDirectory(attachDir);

        // ─── ۱. Health ──────────────────────────────
        app.MapGet("/api/health", () => Results.Json(new { status = "ok", version = "0.1.0" }));

        // ─── ۲. Save state ──────────────────────────
        app.MapPost("/api/save-state", async (HttpRequest req) =>
        {
            try
            {
                using var reader = new StreamReader(req.Body, Encoding.UTF8);
                var body = await reader.ReadToEndAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                if (!root.TryGetProperty("state", out var stateEl))
                    return Results.BadRequest(new { error = "state missing" });

                long savedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                if (root.TryGetProperty("savedAt", out var sAt) && sAt.ValueKind == JsonValueKind.Number)
                    savedAt = sAt.GetInt64();

                var stateJson = JsonSerializer.Serialize(stateEl,
                    new JsonSerializerOptions { WriteIndented = true });

                var content =
                    "/* ═══════════════════════════════════════════════════════════\n" +
                    "   INTERNSHIP OS — State file\n" +
                    "   ───────────────────────────────────────────────────────────\n" +
                    "   آخرین ذخیره: " + DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss") + "\n" +
                    "   ═══════════════════════════════════════════════════════════ */\n\n" +
                    "window.INTERNSHIP_STATE = " + stateJson + ";\n\n" +
                    "window.INTERNSHIP_STATE_SAVED_AT = " + savedAt + ";\n";

                await File.WriteAllTextAsync(stateFile, content, new UTF8Encoding(false));
                return Results.Json(new { ok = true, savedAt, path = stateFile });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ─── ۳. Load state ──────────────────────────
        app.MapGet("/api/load-state", async () =>
        {
            try
            {
                if (!File.Exists(stateFile))
                    return Results.Json(new { exists = false });
                var content = await File.ReadAllTextAsync(stateFile, Encoding.UTF8);
                var stat = new FileInfo(stateFile);
                return Results.Json(new
                {
                    exists = true,
                    content,
                    savedAt = new DateTimeOffset(stat.LastWriteTimeUtc).ToUnixTimeMilliseconds()
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ─── ۴. Upload ──────────────────────────────
        app.MapPost("/api/upload", async (HttpRequest req) =>
        {
            try
            {
                if (!req.HasFormContentType)
                    return Results.BadRequest(new { error = "multipart required" });

                var form = await req.ReadFormAsync();
                var caseId = form["caseId"].ToString();
                var file = form.Files.GetFile("file");

                if (string.IsNullOrEmpty(caseId))
                    return Results.BadRequest(new { error = "caseId required" });
                if (file == null || file.Length == 0)
                    return Results.BadRequest(new { error = "file required" });

                var caseDir = Path.Combine(attachDir, Safe(caseId));
                Directory.CreateDirectory(caseDir);

                var attId = form["attId"].ToString();
                if (string.IsNullOrEmpty(attId))
                    attId = "att-" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString("x")
                              + "-" + Guid.NewGuid().ToString("N").Substring(0, 8);
                var orig = Path.GetFileName(file.FileName);
                var stored = attId + "__" + Safe(orig);
                var filePath = Path.Combine(caseDir, stored);

                using (var s = File.Create(filePath)) { await file.CopyToAsync(s); }

                var meta = new
                {
                    id = attId,
                    caseId,
                    name = orig,
                    type = file.ContentType ?? "application/octet-stream",
                    size = file.Length,
                    storedName = stored,
                    uploadedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };

                await File.WriteAllTextAsync(
                    Path.Combine(caseDir, attId + ".meta.json"),
                    JsonSerializer.Serialize(meta, new JsonSerializerOptions { WriteIndented = true }));

                return Results.Json(new { ok = true, attachment = meta });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ─── ۵. List attachments ────────────────────
        app.MapGet("/api/attachments", (string caseId) =>
        {
            try
            {
                if (string.IsNullOrEmpty(caseId))
                    return Results.BadRequest(new { error = "caseId required" });

                var caseDir = Path.Combine(attachDir, Safe(caseId));
                if (!Directory.Exists(caseDir))
                    return Results.Json(new { attachments = Array.Empty<object>() });

                var metas = Directory.GetFiles(caseDir, "*.meta.json")
                    .Select(f =>
                    {
                        try { return JsonSerializer.Deserialize<JsonElement>(File.ReadAllText(f)); }
                        catch { return default; }
                    })
                    .Where(m => m.ValueKind == JsonValueKind.Object)
                    .OrderBy(m => m.TryGetProperty("uploadedAt", out var u) ? u.GetInt64() : 0)
                    .ToList();

                return Results.Json(new { attachments = metas });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ─── ۶. Serve file ─────────────────────────
        app.MapGet("/api/attachment/{caseId}/{storedName}", (string caseId, string storedName) =>
        {
            try
            {
                var caseDir = Path.Combine(attachDir, Safe(caseId));
                var filePath = Path.Combine(caseDir, Safe(storedName));
                if (!File.Exists(filePath)) return Results.NotFound();

                var attId = storedName.Split("__")[0];
                var metaPath = Path.Combine(caseDir, attId + ".meta.json");
                var ctype = "application/octet-stream";
                if (File.Exists(metaPath))
                {
                    try
                    {
                        var meta = JsonSerializer.Deserialize<JsonElement>(File.ReadAllText(metaPath));
                        if (meta.TryGetProperty("type", out var t))
                            ctype = t.GetString() ?? ctype;
                    }
                    catch { }
                }
                return Results.File(filePath, ctype);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ─── ۷. Delete (DELETE) ────────────────────
        app.MapDelete("/api/attachment-delete/{caseId}/{attId}", (string caseId, string attId) =>
        {
            try
            {
                var caseDir = Path.Combine(attachDir, Safe(caseId));
                if (!Directory.Exists(caseDir)) return Results.NotFound();

                var files = Directory.GetFiles(caseDir, attId + "__*");
                foreach (var f in files) File.Delete(f);

                var metaPath = Path.Combine(caseDir, attId + ".meta.json");
                if (File.Exists(metaPath)) File.Delete(metaPath);

                return Results.Json(new { ok = true, deleted = files.Length });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ─── ۸. Delete (POST) ──────────────────────
        app.MapPost("/api/attachment-delete/{caseId}/{attId}", (string caseId, string attId) =>
        {
            try
            {
                var caseDir = Path.Combine(attachDir, Safe(caseId));
                if (!Directory.Exists(caseDir)) return Results.NotFound();

                var files = Directory.GetFiles(caseDir, attId + "__*");
                foreach (var f in files) File.Delete(f);

                var metaPath = Path.Combine(caseDir, attId + ".meta.json");
                if (File.Exists(metaPath)) File.Delete(metaPath);

                return Results.Json(new { ok = true, deleted = files.Length });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ─── ۹. Open data folder ───────────────────
        app.MapPost("/api/open-data-folder", () =>
        {
            try
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                {
                    FileName = dataDir,
                    UseShellExecute = true
                });
                return Results.Json(new { ok = true, path = dataDir });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ─── ۱۰. Attachments Stats ─────────────────
        app.MapGet("/api/attachments-stats", (string? caseIds) =>
        {
            try
            {
                long totalSize = 0;
                int count = 0;

                // ─── اگه لیست caseIds داده شده، فقط اون‌ها رو بشمر ───
                // (فرمت: caseId1,caseId2,caseId3)
                var filter = new HashSet<string>();
                if (!string.IsNullOrEmpty(caseIds))
                {
                    foreach (var cid in caseIds.Split(',', StringSplitOptions.RemoveEmptyEntries))
                        filter.Add(cid.Trim());
                }

                if (!Directory.Exists(attachDir))
                    return Results.Json(new { count = 0, totalSize = 0L });

                foreach (var caseDir in Directory.GetDirectories(attachDir))
                {
                    var caseName = Path.GetFileName(caseDir);

                    // ─── اگه filter داری و این caseName توش نیست، رد کن ───
                    if (filter.Count > 0 && !filter.Contains(caseName)) continue;

                    foreach (var f in Directory.GetFiles(caseDir, "*.meta.json"))
                    {
                        try
                        {
                            var meta = JsonSerializer.Deserialize<JsonElement>(File.ReadAllText(f));
                            if (meta.TryGetProperty("size", out var s) && s.ValueKind == JsonValueKind.Number)
                                totalSize += s.GetInt64();
                            count++;
                        }
                        catch { }
                    }
                }

                return Results.Json(new { count, totalSize });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ─── ۱۱. حذف کل پوشه‌ی کیس ─────────────────
        void DeleteCaseFolder(string caseId)
        {
            var caseDir = Path.Combine(attachDir, Safe(caseId));
            if (Directory.Exists(caseDir))
                Directory.Delete(caseDir, true);
        }

        app.MapDelete("/api/case-delete/{caseId}", (string caseId) =>
        {
            try
            {
                DeleteCaseFolder(caseId);
                return Results.Json(new { ok = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        app.MapPost("/api/case-delete/{caseId}", (string caseId) =>
        {
            try
            {
                DeleteCaseFolder(caseId);
                return Results.Json(new { ok = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ─── ۱۲. پاک‌سازی پوشه‌های یتیم ──────────────
        app.MapPost("/api/cleanup-orphans", async (HttpRequest req) =>
        {
            try
            {
                // اگه body خالی باشه، همه‌ی پوشه‌ها یتیم هستن
                var validIds = new HashSet<string>();
                if (req.ContentLength > 0 && req.Body != null)
                {
                    try
                    {
                        using var doc = await JsonDocument.ParseAsync(req.Body);
                        var root = doc.RootElement;
                        if (root.TryGetProperty("caseIds", out var arr) && arr.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var el in arr.EnumerateArray())
                            {
                                var s = el.GetString();
                                if (!string.IsNullOrEmpty(s)) validIds.Add(s);
                            }
                        }
                    }
                    catch
                    {
                        // اگه JSON خراب بود، همه رو یتیم در نظر بگیر
                    }
                }

                int removed = 0;
                long freedSize = 0;

                if (Directory.Exists(attachDir))
                {
                    foreach (var caseDir in Directory.GetDirectories(attachDir))
                    {
                        var caseName = Path.GetFileName(caseDir);
                        if (validIds.Contains(caseName)) continue;

                        try
                        {
                            long sz = 0;
                            foreach (var f in Directory.GetFiles(caseDir, "*", SearchOption.AllDirectories))
                                sz += new FileInfo(f).Length;
                            Directory.Delete(caseDir, true);
                            removed++;
                            freedSize += sz;
                        }
                        catch { }
                    }
                }

                return Results.Json(new { ok = true, removed, freedSize });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ─── ۱۳. پاک‌سازی کامل پوشه‌ی attachments ─────
        app.MapPost("/api/clear-all-attachments", () =>
        {
            try
            {
                if (Directory.Exists(attachDir))
                {
                    foreach (var dir in Directory.GetDirectories(attachDir))
                    {
                        try { Directory.Delete(dir, true); } catch { }
                    }
                }
                return Results.Json(new { ok = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ─── ۱۴. پاک‌سازی کامل (state + attachments) ──
        app.MapPost("/api/reset-all", () =>
        {
            try
            {
                // پاک کردن state.js
                if (File.Exists(stateFile))
                {
                    try { File.Delete(stateFile); } catch { }
                }
                // پاک کردن کل پوشه‌ی attachments
                if (Directory.Exists(attachDir))
                {
                    foreach (var dir in Directory.GetDirectories(attachDir))
                    {
                        try { Directory.Delete(dir, true); } catch { }
                    }
                }
                return Results.Json(new { ok = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ═══════════════════════════════════════════
        //  ۱۷. بررسی آپدیت
        // ═══════════════════════════════════════════
        app.MapGet("/api/check-update", async (string url) =>
        {
            try
            {
                if (string.IsNullOrEmpty(url))
                    return Results.BadRequest(new { error = "url required" });

                using var http = new HttpClient();
                http.Timeout = TimeSpan.FromSeconds(15);
                http.DefaultRequestHeaders.Add("User-Agent", "Internship-OS");
                var json = await http.GetStringAsync(url);
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                var latest = root.TryGetProperty("latest", out var l) ? l.GetString() : "";
                var zipUrl = root.TryGetProperty("zipUrl", out var z) ? z.GetString() : "";
                var notes = root.TryGetProperty("releaseNotes", out var n) ? n.GetString() : "";
                var publishedAt = root.TryGetProperty("publishedAt", out var p) ? p.GetString() : "";

                return Results.Json(new { ok = true, latest, zipUrl, notes, publishedAt });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ═══════════════════════════════════════════
        //  ۱۸. نصب آپدیت
        // ═══════════════════════════════════════════
        app.MapPost("/api/apply-update", async (HttpRequest req) =>
        {
            try
            {
                using var doc = await JsonDocument.ParseAsync(req.Body);
                var root = doc.RootElement;
                var zipUrl = root.GetProperty("zipUrl").GetString();
                var newVersion = root.GetProperty("newVersion").GetString();

                if (string.IsNullOrEmpty(zipUrl))
                    return Results.BadRequest(new { error = "zipUrl required" });

                var tempZip = Path.Combine(Path.GetTempPath(), "internship-os-update-" + Guid.NewGuid().ToString("N") + ".zip");
                var tempDir = Path.Combine(Path.GetTempPath(), "internship-os-update-" + Guid.NewGuid().ToString("N"));

                // ─── دانلود ZIP ───
                using (var http = new HttpClient())
                {
                    http.Timeout = TimeSpan.FromMinutes(5);
                    http.DefaultRequestHeaders.Add("User-Agent", "Internship-OS");
                    var bytes = await http.GetByteArrayAsync(zipUrl);
                    await File.WriteAllBytesAsync(tempZip, bytes);
                }

                // ─── Extract ───
                Directory.CreateDirectory(tempDir);
                System.IO.Compression.ZipFile.ExtractToDirectory(tempZip, tempDir);

                // ─── تشخیص ساختار ZIP ───
                var sourceAppDir = tempDir;
                if (Directory.Exists(Path.Combine(tempDir, "app")))
                    sourceAppDir = Path.Combine(tempDir, "app");

                // ─── بکاپ app/ قدیمی ───
                var backupDir = appDir + ".bak-" + DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                if (Directory.Exists(backupDir)) Directory.Delete(backupDir, true);
                Directory.Move(appDir, backupDir);

                // ─── کپی فایل‌های جدید ───
                Directory.CreateDirectory(appDir);
                foreach (var file in Directory.GetFiles(sourceAppDir, "*", SearchOption.AllDirectories))
                {
                    var rel = Path.GetRelativePath(sourceAppDir, file);
                    var dest = Path.Combine(appDir, rel);
                    Directory.CreateDirectory(Path.GetDirectoryName(dest));
                    File.Copy(file, dest, true);
                }

                // ─── Cleanup ───
                try { File.Delete(tempZip); Directory.Delete(tempDir, true); } catch { }

                // ─── پاک‌سازی backupهای قدیمی (فقط ۲ تای آخر بمونن) ───
                try
                {
                    var rootDir = Path.GetDirectoryName(appDir);
                    var backups = Directory.GetDirectories(rootDir, "app.bak-*")
                        .OrderByDescending(d => d)
                        .Skip(2)
                        .ToList();
                    foreach (var b in backups) try { Directory.Delete(b, true); } catch { }
                }
                catch { }

                // ─── Restart بعد از ۱.۵ ثانیه ───
                Task.Run(async () =>
                {
                    await Task.Delay(1500);
                    try
                    {
                        var exe = Environment.ProcessPath;
                        if (!string.IsNullOrEmpty(exe))
                        {
                            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                            {
                                FileName = exe,
                                UseShellExecute = true
                            });
                        }
                    }
                    catch { }
                    Environment.Exit(0);
                });

                return Results.Json(new { ok = true, version = newVersion, backup = backupDir });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ═══════════════════════════════════════════
        //  AI LAYER — Multi-Provider Proxy (v5 - per-provider keys)
        // ═══════════════════════════════════════════

        var aiConfigFile = Path.Combine(dataDir, "ai-config.json");

        // DEFAULT_GROQ_KEY_INIT — مقدار پیش‌فرض بار اول
        if (!File.Exists(aiConfigFile))
        {
            try
            {
                var defaultKeys = new System.Text.Json.Nodes.JsonObject();
                defaultKeys["groq"] = "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";
                var defaultCfg = new System.Text.Json.Nodes.JsonObject
                {
                    ["provider"] = "groq",
                    ["model"] = "openai/gpt-oss-120b",
                    ["proxyMode"] = "auto",
                    ["proxy"] = "",
                    ["customEndpoint"] = "",
                    ["apiKeys"] = defaultKeys,
                    ["savedAt"] = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };
                File.WriteAllText(
                    aiConfigFile,
                    defaultCfg.ToJsonString(new JsonSerializerOptions { WriteIndented = true }),
                    new UTF8Encoding(false));
            }
            catch { }
        }

        var PROVIDER_BASES = new Dictionary<string, string>
        {
            ["groq"]       = "https://api.groq.com/openai/v1",
            ["openai"]     = "https://api.openai.com/v1",
            ["gemini"]     = "https://generativelanguage.googleapis.com/v1beta/openai",
            ["deepseek"]   = "https://api.deepseek.com/v1",
            ["openrouter"] = "https://openrouter.ai/api/v1",
            ["ollama"]     = "http://localhost:11434/v1",
            ["lmstudio"]   = "http://localhost:1234/v1"
        };

        var PROVIDER_DEFAULTS = new Dictionary<string, string>
        {
            ["groq"]       = "openai/gpt-oss-120b",
            ["openai"]     = "gpt-4o-mini",
            ["gemini"]     = "gemini-2.0-flash",
            ["deepseek"]   = "deepseek-chat",
            ["openrouter"] = "meta-llama/llama-3.3-70b-instruct:free",
            ["ollama"]     = "llama3.2",
            ["lmstudio"]   = ""
        };

        bool IsAiEnabled() { try { if (!File.Exists(aiConfigFile)) return true; var _c = LoadAiConfig(); if (_c["enabled"] is System.Text.Json.Nodes.JsonValue _v) return _v.GetValue<bool>(); return true; } catch { return true; } }

        var PROVIDER_NEEDS_KEY = new Dictionary<string, bool>
        {
            ["groq"]       = true,
            ["openai"]     = true,
            ["gemini"]     = true,
            ["deepseek"]   = true,
            ["openrouter"] = true,
            ["ollama"]     = false,
            ["lmstudio"]   = false,
            ["custom"]     = false
        };

        string ResolveProviderBase(string provider, string customEndpoint)
        {
            if (provider == "custom")
            {
                if (!string.IsNullOrEmpty(customEndpoint))
                    return customEndpoint.TrimEnd('/');
                return "";
            }
            return PROVIDER_BASES.TryGetValue(provider, out var b) ? b : PROVIDER_BASES["groq"];
        }

        System.Text.Json.Nodes.JsonObject LoadAiConfig()
        {
            if (!File.Exists(aiConfigFile)) return new System.Text.Json.Nodes.JsonObject();
            try
            {
                var json = File.ReadAllText(aiConfigFile);
                var node = System.Text.Json.Nodes.JsonNode.Parse(json);
                return node as System.Text.Json.Nodes.JsonObject ?? new System.Text.Json.Nodes.JsonObject();
            }
            catch { return new System.Text.Json.Nodes.JsonObject(); }
        }

        string GetProviderKey(System.Text.Json.Nodes.JsonObject cfg, string provider)
        {
            if (cfg["apiKeys"] is System.Text.Json.Nodes.JsonObject keys &&
                keys[provider] is System.Text.Json.Nodes.JsonValue v)
            {
                return v.GetValue<string>() ?? "";
            }
            // Legacy format
            if (cfg["provider"] is System.Text.Json.Nodes.JsonValue pv &&
                pv.GetValue<string>() == provider &&
                cfg["apiKey"] is System.Text.Json.Nodes.JsonValue lk)
            {
                return lk.GetValue<string>() ?? "";
            }
            return "";
        }

        Dictionary<string, bool> BuildHasKeysMap(System.Text.Json.Nodes.JsonObject cfg)
        {
            var hasKeys = new Dictionary<string, bool>();
            foreach (var kv in PROVIDER_NEEDS_KEY)
            {
                if (!kv.Value) { hasKeys[kv.Key] = true; continue; }
                hasKeys[kv.Key] = !string.IsNullOrEmpty(GetProviderKey(cfg, kv.Key));
            }
            return hasKeys;
        }

        HttpClientHandler BuildHandler(string proxyMode, string manualProxy)
        {
            var handler = new HttpClientHandler();
            if (proxyMode == "manual" && !string.IsNullOrEmpty(manualProxy))
            {
                try { handler.Proxy = new System.Net.WebProxy(manualProxy); handler.UseProxy = true; } catch { }
            }
            else if (proxyMode == "manual")
            {
                // manual بدون آدرس → بدون پروکسی
                handler.UseProxy = false;
            }
            else if (proxyMode == "auto")
            {
                try
                {
                    var sysProxy = System.Net.WebRequest.DefaultWebProxy;
                    if (sysProxy != null) { handler.Proxy = sysProxy; handler.UseProxy = true; }
                }
                catch { }
            }
            else if (proxyMode == "direct")
            {
                handler.UseProxy = false;
            }
            return handler;
        }

        // ─── ۱۹. AI Status ─────────────────────────
        app.MapGet("/api/ai/status", () =>
        {
            try
            {
                var cfg = LoadAiConfig();
                var isEnabled = IsAiEnabled();
                var provider = cfg["provider"] is System.Text.Json.Nodes.JsonValue pv ? (pv.GetValue<string>() ?? "groq") : "groq";
                if (string.IsNullOrEmpty(provider)) provider = "groq";
                var model = cfg["model"] is System.Text.Json.Nodes.JsonValue mv ? (mv.GetValue<string>() ?? "") : "";
                var proxyMode = cfg["proxyMode"] is System.Text.Json.Nodes.JsonValue pmv ? (pmv.GetValue<string>() ?? "auto") : "auto";
                var customEndpoint = cfg["customEndpoint"] is System.Text.Json.Nodes.JsonValue cev ? (cev.GetValue<string>() ?? "") : "";

                var hasKeys = BuildHasKeysMap(cfg);
                var needsKey = PROVIDER_NEEDS_KEY.TryGetValue(provider, out var nk) ? nk : true;
                var currentHasKey = hasKeys.TryGetValue(provider, out var chk) ? chk : false;
                var configured = needsKey ? currentHasKey : true;

                return Results.Json(new
                {
                    enabled = isEnabled,
                    configured,
                    provider,
                    model,
                    hasKeys,
                    needsKey,
                    proxyMode,
                    customEndpoint
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ─── ۲۰. AI Config save ────────────────────
        app.MapPost("/api/ai/config", async (HttpRequest req) =>
        {
            try
            {
                using var reader = new StreamReader(req.Body, Encoding.UTF8);
                var body = await reader.ReadToEndAsync();
                var incoming = System.Text.Json.Nodes.JsonNode.Parse(body) as System.Text.Json.Nodes.JsonObject;
                if (incoming == null)
                    return Results.Json(new { error = "invalid body" }, statusCode: 400);

                var cfg = LoadAiConfig();

                var provider = incoming["provider"] is System.Text.Json.Nodes.JsonValue pv ? (pv.GetValue<string>() ?? "groq") : "groq";
                if (string.IsNullOrEmpty(provider)) provider = "groq";

                var model = incoming["model"] is System.Text.Json.Nodes.JsonValue mv ? (mv.GetValue<string>() ?? "") : "";
                if (string.IsNullOrEmpty(model) && PROVIDER_DEFAULTS.TryGetValue(provider, out var defM))
                    model = defM;

                var proxyMode = incoming["proxyMode"] is System.Text.Json.Nodes.JsonValue pmv ? (pmv.GetValue<string>() ?? "auto") : "auto";
                var proxy = incoming["proxy"] is System.Text.Json.Nodes.JsonValue prv ? (prv.GetValue<string>() ?? "") : "";
                var customEndpoint = incoming["customEndpoint"] is System.Text.Json.Nodes.JsonValue cev ? (cev.GetValue<string>() ?? "") : "";

                if (incoming["enabled"] is System.Text.Json.Nodes.JsonValue _en) cfg["enabled"] = _en.GetValue<bool>();

                cfg["provider"] = provider;
                cfg["model"] = model;
                cfg["proxyMode"] = proxyMode;
                cfg["proxy"] = proxy;
                cfg["customEndpoint"] = customEndpoint;
                cfg["savedAt"] = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

                // ─── Migrate legacy apiKey → apiKeys ───
                System.Text.Json.Nodes.JsonObject keys;
                if (cfg["apiKeys"] is System.Text.Json.Nodes.JsonObject existingKeys)
                {
                    keys = existingKeys;
                }
                else
                {
                    keys = new System.Text.Json.Nodes.JsonObject();
                    if (cfg["apiKey"] is System.Text.Json.Nodes.JsonValue lk)
                    {
                        var legacyProvider = cfg["provider"] is System.Text.Json.Nodes.JsonValue lpv
                            ? (lpv.GetValue<string>() ?? "groq") : "groq";
                        var legacyKey = lk.GetValue<string>() ?? "";
                        if (!string.IsNullOrEmpty(legacyKey) && !string.IsNullOrEmpty(legacyProvider))
                            keys[legacyProvider] = legacyKey;
                    }
                    cfg.Remove("apiKey");
                }

                // ─── Handle incoming apiKey for CURRENT provider ───
                if (incoming["apiKey"] is System.Text.Json.Nodes.JsonValue kv)
                {
                    var keyVal = kv.GetValue<string>() ?? "";
                    if (keyVal != "__keep__")
                        keys[provider] = keyVal;
                }

                cfg["apiKeys"] = keys;

                var opts = new JsonSerializerOptions { WriteIndented = true };
                await File.WriteAllTextAsync(aiConfigFile, cfg.ToJsonString(opts), new UTF8Encoding(false));

                return Results.Json(new
                {
                    ok = true,
                    provider,
                    model,
                    proxyMode,
                    customEndpoint,
                    hasKeys = BuildHasKeysMap(cfg)
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });

        // ─── ۲۱. AI Models list ────────────────────
        app.MapGet("/api/ai/models", async () =>
        {
            try
            {
                var cfg = LoadAiConfig();
                if (cfg.Count == 0)
                    return Results.Json(new { error = "not_configured", hint = "تنظیمات دستیار هوشمند ذخیره نشده." }, statusCode: 200);

                var provider = cfg["provider"] is System.Text.Json.Nodes.JsonValue pv ? (pv.GetValue<string>() ?? "groq") : "groq";
                if (string.IsNullOrEmpty(provider)) provider = "groq";
                var proxyMode = cfg["proxyMode"] is System.Text.Json.Nodes.JsonValue pmv ? (pmv.GetValue<string>() ?? "auto") : "auto";
                var manualProxy = cfg["proxy"] is System.Text.Json.Nodes.JsonValue prv ? (prv.GetValue<string>() ?? "") : "";
                var customEndpoint = cfg["customEndpoint"] is System.Text.Json.Nodes.JsonValue cev ? (cev.GetValue<string>() ?? "") : "";
                var apiKey = GetProviderKey(cfg, provider);

                var baseUrl = ResolveProviderBase(provider, customEndpoint);
                if (string.IsNullOrEmpty(baseUrl))
                    return Results.Json(new { error = "no_endpoint", hint = "آدرس سرویس سفارشی وارد نشده. آن را در تنظیمات وارد کن." }, statusCode: 200);

                var handler = BuildHandler(proxyMode, manualProxy);
                using var http = new HttpClient(handler);
                http.Timeout = TimeSpan.FromSeconds(20);
                http.DefaultRequestHeaders.Add("User-Agent", "Internship-OS");
                if (!string.IsNullOrEmpty(apiKey))
                    http.DefaultRequestHeaders.Add("Authorization", "Bearer " + apiKey);

                var resp = await http.GetAsync(baseUrl + "/models");
                var body = await resp.Content.ReadAsStringAsync();

                if (!resp.IsSuccessStatusCode)
                {
                    int sc = (int)resp.StatusCode;
                    string hint = sc == 401 ? "کلید API اشتباه است. کلید را دوباره چک کن."
                                : sc == 403 ? "سرویس AI از IP ایران پاسخ نمی‌دهد. VPN یا پروکسی خود را روشن کن."
                                : sc == 429 ? "محدودیت مصرف. کمی بعد امتحان کن."
                                : sc >= 500 ? "سرور AI موقتاً مشکل دارد."
                                : "پاسخ نامشخص از سرویس.";
                    return Results.Json(new { error = "provider_error", code = sc.ToString(), hint, detail = body }, statusCode: 200);
                }

                using var doc = JsonDocument.Parse(body);
                var data = doc.RootElement.TryGetProperty("data", out var d) ? d : default;
                var models = new List<object>();
                if (data.ValueKind == JsonValueKind.Array)
                {
                    foreach (var m in data.EnumerateArray())
                    {
                        var id = m.TryGetProperty("id", out var idEl) ? idEl.GetString() : "";
                        if (string.IsNullOrEmpty(id)) continue;
                        if (id.Contains("whisper", StringComparison.OrdinalIgnoreCase)) continue;
                        if (id.Contains("tts", StringComparison.OrdinalIgnoreCase)) continue;
                        models.Add(new { id });
                    }
                }

                return Results.Content(
                    JsonSerializer.Serialize(new { ok = true, provider, models }),
                    "application/json; charset=utf-8");
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = "unknown", hint = ex.Message }, statusCode: 200);
            }
        });
        // ─── ۲۳. AI Test Key (بدون ذخیره) ────────
        app.MapPost("/api/ai/test-key", async (HttpRequest req) =>
        {
            try
            {
                using var reader = new StreamReader(req.Body, Encoding.UTF8);
                var body = await reader.ReadToEndAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                var provider = root.TryGetProperty("provider", out var p) ? (p.GetString() ?? "groq") : "groq";
                var apiKey = root.TryGetProperty("apiKey", out var k) ? (k.GetString() ?? "") : "";
                // TEST-KEY-KEEP-HANDLER: اگه __keep__ بود، از کلید ذخیره‌شده استفاده کن
                if (apiKey == "__keep__")
                {
                    var _cfg = LoadAiConfig();
                    apiKey = GetProviderKey(_cfg, provider);
                }
                var proxyMode = root.TryGetProperty("proxyMode", out var pm) ? (pm.GetString() ?? "auto") : "auto";
                var proxy = root.TryGetProperty("proxy", out var pr) ? (pr.GetString() ?? "") : "";
                var customEndpoint = root.TryGetProperty("customEndpoint", out var ce) ? (ce.GetString() ?? "") : "";
                var model = root.TryGetProperty("model", out var m) ? (m.GetString() ?? "") : "";

                if (string.IsNullOrEmpty(model) && PROVIDER_DEFAULTS.TryGetValue(provider, out var dm))
                    model = dm;

                var needsKey = PROVIDER_NEEDS_KEY.TryGetValue(provider, out var nk) ? nk : true;
                if (needsKey && string.IsNullOrEmpty(apiKey))
                    return Results.Json(new { error = "no_key", hint = "کلید API را وارد کن." }, statusCode: 200);

                // ─── اعتبارسنجی کلید: فقط کاراکترهای امن ───
                if (!string.IsNullOrEmpty(apiKey))
                {
                    foreach (var ch in apiKey)
                    {
                        if (ch > 127)
                            return Results.Json(new { error = "bad_key", hint = "کلید API فقط باید شامل حروف انگلیسی، عدد، _ یا - باشد." }, statusCode: 200);
                    }
                }

                var baseUrl = ResolveProviderBase(provider, customEndpoint);
                if (string.IsNullOrEmpty(baseUrl))
                    return Results.Json(new { error = "no_endpoint", hint = "آدرس سرویس سفارشی را وارد کن." }, statusCode: 200);

                var testPayload = new
                {
                    model = model,
                    messages = new object[]
                    {
                        new { role = "system", content = "کوتاه جواب بده." },
                        new { role = "user", content = "فقط بنویس: سلام" }
                    },
                    max_tokens = 15,
                    temperature = 0.3
                };
                var finalBody = JsonSerializer.Serialize(testPayload);

                var handler = BuildHandler(proxyMode, proxy);
                using var http = new HttpClient(handler);
                http.Timeout = TimeSpan.FromSeconds(30);
                http.DefaultRequestHeaders.Add("User-Agent", "Internship-OS");
                if (!string.IsNullOrEmpty(apiKey))
                    http.DefaultRequestHeaders.Add("Authorization", "Bearer " + apiKey);

                if (provider == "openrouter")
                {
                    http.DefaultRequestHeaders.Add("HTTP-Referer", "http://localhost");
                    http.DefaultRequestHeaders.Add("X-Title", "Internship OS");
                }

                HttpResponseMessage response;
                try
                {
                    var content = new StringContent(finalBody, Encoding.UTF8, "application/json");
                    response = await http.PostAsync(baseUrl + "/chat/completions", content);
                }
                catch (TaskCanceledException)
                {
                    return Results.Json(new { error = "timeout", hint = "زمان انتظار تمام شد. اینترنت یا VPN را بررسی کن." }, statusCode: 200);
                }
                catch (HttpRequestException hex)
                {
                    return Results.Json(new { error = "network", hint = "به سرور AI نرسیدیم. اتصال اینترنت یا VPN را بررسی کن.", detail = hex.Message }, statusCode: 200);
                }

                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    int sc = (int)response.StatusCode;
                    string code, hint;
                    if (sc == 401) { code = "unauthorized"; hint = "کلید API اشتباه است."; }
                    else if (sc == 403) { code = "forbidden"; hint = "سرویس AI از IP شما پاسخ نمی‌دهد. VPN یا پروکسی را روشن کن."; }
                    else if (sc == 429) { code = "rate_limit"; hint = "محدودیت مصرف. کمی صبر کن."; }
                    else if (sc == 404) { code = "model_not_found"; hint = "مدل انتخابی موجود نیست."; }
                    else if (sc >= 500) { code = "server_error"; hint = "سرور AI موقتاً مشکل دارد."; }
                    else { code = "provider_error"; hint = "پاسخ نامشخص از سرور AI."; }
                    return Results.Json(new { error = code, code = sc.ToString(), hint, detail = responseBody }, statusCode: 200);
                }

                return Results.Content(responseBody, "application/json; charset=utf-8");
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = "unknown", hint = ex.Message }, statusCode: 200);
            }
        });

        // ─── ۲۳.۵. AI Reveal Key ──────────────────
        app.MapPost("/api/ai/reveal-key", async (HttpRequest req) =>
        {
            try
            {
                using var rdr = new StreamReader(req.Body, Encoding.UTF8);
                var rbody = await rdr.ReadToEndAsync();
                using var rdoc = JsonDocument.Parse(rbody);
                var rroot = rdoc.RootElement;
                var rprovider = rroot.TryGetProperty("provider", out var rp) ? (rp.GetString() ?? "groq") : "groq";
                var rcfg = LoadAiConfig();
                var rapiKey = GetProviderKey(rcfg, rprovider);
                return Results.Json(new { ok = true, apiKey = rapiKey });
            }
            catch (Exception rex)
            {
                return Results.Json(new { error = rex.Message }, statusCode: 500);
            }
        });

        // ─── ۲۴. AI Reset to Default ──────────────
        app.MapPost("/api/ai/reset-default", async () =>
        {
            try
            {
                var defaultKeys = new System.Text.Json.Nodes.JsonObject();
                defaultKeys["groq"] = "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";

                var defaultCfg = new System.Text.Json.Nodes.JsonObject
                {
                    ["provider"] = "groq",
                    ["model"] = "openai/gpt-oss-120b",
                    ["proxyMode"] = "auto",
                    ["proxy"] = "",
                    ["customEndpoint"] = "",
                    ["apiKeys"] = defaultKeys,
                    ["savedAt"] = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };

                await File.WriteAllTextAsync(
                    aiConfigFile,
                    defaultCfg.ToJsonString(new JsonSerializerOptions { WriteIndented = true }),
                    new UTF8Encoding(false));

                return Results.Json(new { ok = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        });


        // ─── ۲۲. AI Chat proxy ─────────────────────
        app.MapPost("/api/ai/chat", async (HttpRequest req) =>
        {
            try
            {
                var cfg = LoadAiConfig();
                if (!IsAiEnabled()) return Results.Json(new { error = "ai_disabled", hint = "AI disabled." }, statusCode: 200);
                if (cfg.Count == 0)
                    return Results.Json(new { error = "not_configured", hint = "تنظیمات دستیار هوشمند ذخیره نشده." }, statusCode: 200);

                var provider = cfg["provider"] is System.Text.Json.Nodes.JsonValue pv ? (pv.GetValue<string>() ?? "groq") : "groq";
                if (string.IsNullOrEmpty(provider)) provider = "groq";
                var apiKey = GetProviderKey(cfg, provider);
                var cfgModel = cfg["model"] is System.Text.Json.Nodes.JsonValue mv ? (mv.GetValue<string>() ?? "") : "";
                var proxyMode = cfg["proxyMode"] is System.Text.Json.Nodes.JsonValue pmv ? (pmv.GetValue<string>() ?? "auto") : "auto";
                var manualProxy = cfg["proxy"] is System.Text.Json.Nodes.JsonValue prv ? (prv.GetValue<string>() ?? "") : "";
                var customEndpoint = cfg["customEndpoint"] is System.Text.Json.Nodes.JsonValue cev ? (cev.GetValue<string>() ?? "") : "";

                var needsKey = PROVIDER_NEEDS_KEY.TryGetValue(provider, out var nk) ? nk : true;
                if (needsKey && string.IsNullOrEmpty(apiKey))
                    return Results.Json(new { error = "no_key", hint = "کلید API برای این سرویس تنظیم نشده." }, statusCode: 200);

                var baseUrl = ResolveProviderBase(provider, customEndpoint);
                if (string.IsNullOrEmpty(baseUrl))
                    return Results.Json(new { error = "no_endpoint", hint = "آدرس سرویس سفارشی وارد نشده." }, statusCode: 200);

                using var reader = new StreamReader(req.Body, Encoding.UTF8);
                var body = await reader.ReadToEndAsync();

                Dictionary<string, object>? payload;
                try
                {
                    payload = JsonSerializer.Deserialize<Dictionary<string, object>>(body);
                    if (payload == null) payload = new Dictionary<string, object>();
                    if (!payload.ContainsKey("model") || string.IsNullOrEmpty(payload["model"]?.ToString()))
                        payload["model"] = string.IsNullOrEmpty(cfgModel)
                            ? (PROVIDER_DEFAULTS.TryGetValue(provider, out var dm) ? dm : "")
                            : cfgModel;
                }
                catch
                {
                    return Results.Json(new { error = "bad_request", hint = "درخواست نامعتبر" }, statusCode: 200);
                }

                var finalBody = JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = false });

                var handler = BuildHandler(proxyMode, manualProxy);
                using var http = new HttpClient(handler);
                http.Timeout = TimeSpan.FromSeconds(90);
                http.DefaultRequestHeaders.Add("User-Agent", "Internship-OS");
                if (!string.IsNullOrEmpty(apiKey))
                    http.DefaultRequestHeaders.Add("Authorization", "Bearer " + apiKey);

                if (provider == "openrouter")
                {
                    http.DefaultRequestHeaders.Add("HTTP-Referer", "http://localhost");
                    http.DefaultRequestHeaders.Add("X-Title", "Internship OS");
                }

                HttpResponseMessage response;
                try
                {
                    var content = new StringContent(finalBody, Encoding.UTF8, "application/json");
                    response = await http.PostAsync(baseUrl + "/chat/completions", content);
                }
                catch (TaskCanceledException)
                {
                    return Results.Json(new { error = "timeout", hint = "زمان انتظار تمام شد. ممکن است اینترنت کند باشد یا VPN لازم باشد." }, statusCode: 200);
                }
                catch (HttpRequestException hex)
                {
                    return Results.Json(new { error = "network", hint = "به سرور AI نرسیدیم. اتصال اینترنت یا VPN خود را بررسی کن.", detail = hex.Message }, statusCode: 200);
                }

                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    int sc = (int)response.StatusCode;
                    string code, hint;
                    if (sc == 401) { code = "unauthorized"; hint = "کلید API اشتباه است. کلید را دوباره چک کن یا کلید جدید بساز."; }
                    else if (sc == 403) { code = "forbidden"; hint = "سرویس AI از IP ایران پاسخ نمی‌دهد. VPN یا پروکسی خود را روشن کن."; }
                    else if (sc == 429) { code = "rate_limit"; hint = "محدودیت مصرف. چند لحظه صبر کن."; }
                    else if (sc >= 500) { code = "server_error"; hint = "سرور AI موقتاً مشکل دارد. کمی بعد امتحان کن."; }
                    else { code = "provider_error"; hint = "پاسخ نامشخص از سرور AI."; }

                    return Results.Json(new { error = code, code = sc.ToString(), hint, detail = responseBody }, statusCode: 200);
                }

                return Results.Content(responseBody, "application/json; charset=utf-8");
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = "unknown", hint = ex.Message }, statusCode: 200);
            }
        });

        /* PATCH:phase-F1-fooddb — read-only Food.db API */
        // ─── Food.db path resolution ─────────────────
        var foodDbPath = Path.Combine(rootDir, "Food.db");
        var _fdbAlt = Path.GetFullPath(Path.Combine(rootDir, "..", "Food.db"));
        if (!File.Exists(foodDbPath) && File.Exists(_fdbAlt)) foodDbPath = _fdbAlt;

        string FoodDbConnStr() =>
            "Data Source=" + foodDbPath + ";Mode=ReadOnly;Cache=Shared;Pooling=True";

        // Persian search normalization: keep displayed names untouched.
        static string NormFa(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace('\u064A', '\u06CC')   // Arabic Yeh  -> Persian Yeh
                    .Replace('\u0643', '\u06A9')   // Arabic Kaf  -> Persian Kaf
                    .Replace('\u200C', ' ')        // ZWNJ        -> space
                    .Replace('\u200E', ' ')        // LRM         -> space
                    .Replace('\u200F', ' ');       // RLM         -> space
        }

        // SQLite-side normalization expression for a given column
        string NormSqlCol(string col) =>
            "REPLACE(REPLACE(REPLACE(" + col + ",'ي','ی'),'ك','ک'),char(8204),' ')";

        string LikeEscape(string s) =>
            s.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

        // ─── /api/fooddb/health ───────────────────────
        app.MapGet("/api/fooddb/health", () =>
        {
            try
            {
                if (!File.Exists(foodDbPath))
                    return Results.Json(new { ok = false, error = "db_missing" }, statusCode: 503);
                using var con = new Microsoft.Data.Sqlite.SqliteConnection(FoodDbConnStr());
                con.Open();
                using var cmd = con.CreateCommand();
                cmd.CommandText = "SELECT COUNT(*) FROM foods WHERE status = 1";
                var n = Convert.ToInt64(cmd.ExecuteScalar() ?? 0L);
                using var cmd2 = con.CreateCommand();
                cmd2.CommandText = "SELECT COUNT(*) FROM exercises WHERE status = 1";
                var m = Convert.ToInt64(cmd2.ExecuteScalar() ?? 0L);
                return Results.Json(new { ok = true, foods = n, exercises = m });
            }
            catch (Exception ex)
            {
                return Results.Json(new { ok = false, error = "db_error", detail = ex.Message }, statusCode: 500);
            }
        });

        // ─── /api/fooddb/categories ───────────────────
        app.MapGet("/api/fooddb/categories", () =>
        {
            try
            {
                if (!File.Exists(foodDbPath))
                    return Results.Json(new { error = "db_missing" }, statusCode: 503);
                using var con = new Microsoft.Data.Sqlite.SqliteConnection(FoodDbConnStr());
                con.Open();
                using var cmd = con.CreateCommand();
                cmd.CommandText =
                    "SELECT c.catId, c.catName, COUNT(f.foodId) AS cnt " +
                    "FROM food_cats c " +
                    "INNER JOIN foods f ON f.catId = c.catId AND f.status = 1 " +
                    "GROUP BY c.catId, c.catName ORDER BY c.catName";
                var list = new List<object>();
                using var r = cmd.ExecuteReader();
                while (r.Read())
                    list.Add(new { id = r.GetInt32(0), name = r.GetString(1), count = r.GetInt32(2) });
                return Results.Json(new { categories = list });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = "db_error", detail = ex.Message }, statusCode: 500);
            }
        });

        // ─── /api/fooddb/exercise-categories ──────────
        app.MapGet("/api/fooddb/exercise-categories", () =>
        {
            try
            {
                if (!File.Exists(foodDbPath))
                    return Results.Json(new { error = "db_missing" }, statusCode: 503);
                using var con = new Microsoft.Data.Sqlite.SqliteConnection(FoodDbConnStr());
                con.Open();
                using var cmd = con.CreateCommand();
                cmd.CommandText =
                    "SELECT c.catId, c.catName, COUNT(e.exerciseId) AS cnt " +
                    "FROM exercise_cat c " +
                    "INNER JOIN exercises e ON e.catId = c.catId AND e.status = 1 " +
                    "GROUP BY c.catId, c.catName ORDER BY c.catName";
                var list = new List<object>();
                using var r = cmd.ExecuteReader();
                while (r.Read())
                    list.Add(new { id = r.GetInt32(0), name = r.GetString(1), count = r.GetInt32(2) });
                return Results.Json(new { categories = list });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = "db_error", detail = ex.Message }, statusCode: 500);
            }
        });

        // ─── /api/fooddb/foods ────────────────────────
        app.MapGet("/api/fooddb/foods", (string? q, int? categoryId, int? limit) =>
        {
            try
            {
                if (!File.Exists(foodDbPath))
                    return Results.Json(new { error = "db_missing" }, statusCode: 503);

                int lim = Math.Clamp(limit ?? 20, 1, 50);
                string raw = (q ?? "").Trim();
                if (raw.Length > 100) raw = raw.Substring(0, 100);
                string nq = NormFa(raw);

                using var con = new Microsoft.Data.Sqlite.SqliteConnection(FoodDbConnStr());
                con.Open();
                using var cmd = con.CreateCommand();

                string where = "f.status = 1";
                if (categoryId.HasValue) where += " AND f.catId = $cat";

                if (nq.Length == 0)
                {
                    cmd.CommandText =
                        "SELECT f.foodId, f.foodName, f.catId, c.catName, f.amount, f.calorie " +
                        "FROM foods f LEFT JOIN food_cats c ON c.catId = f.catId " +
                        "WHERE " + where + " ORDER BY f.foodId LIMIT $lim";
                }
                else
                {
                    string likeEsc = "%" + LikeEscape(nq) + "%";
                    string startEsc = LikeEscape(nq) + "%";
                    cmd.CommandText =
                        "SELECT f.foodId, f.foodName, f.catId, c.catName, f.amount, f.calorie, " +
                        "  CASE " +
                        "    WHEN " + NormSqlCol("f.foodName") + " = $exact THEN 0 " +
                        "    WHEN " + NormSqlCol("f.foodName") + " LIKE $start ESCAPE '\\' THEN 1 " +
                        "    WHEN " + NormSqlCol("f.foodName") + " LIKE $like  ESCAPE '\\' THEN 2 " +
                        "    ELSE 3 END AS rank " +
                        "FROM foods f LEFT JOIN food_cats c ON c.catId = f.catId " +
                        "WHERE " + where + " AND " + NormSqlCol("f.foodName") + " LIKE $like ESCAPE '\\' " +
                        "ORDER BY rank ASC, LENGTH(f.foodName) ASC, f.foodId ASC LIMIT $lim";
                    cmd.Parameters.AddWithValue("$exact", nq);
                    cmd.Parameters.AddWithValue("$start", startEsc);
                    cmd.Parameters.AddWithValue("$like", likeEsc);
                }
                cmd.Parameters.AddWithValue("$lim", lim);
                if (categoryId.HasValue) cmd.Parameters.AddWithValue("$cat", categoryId.Value);

                var list = new List<object>();
                using var r = cmd.ExecuteReader();
                while (r.Read())
                {
                    double amt = r.IsDBNull(4) ? 0.0 : r.GetDouble(4);
                    double cal = r.IsDBNull(5) ? -1.0 : r.GetDouble(5);
                    double? kcal100 = (amt > 0 && cal >= 0) ? (cal * 100.0 / amt) : (double?)null;
                    list.Add(new
                    {
                        id = r.GetInt64(0),
                        name = r.GetString(1),
                        categoryId = r.IsDBNull(2) ? 0 : r.GetInt32(2),
                        categoryName = r.IsDBNull(3) ? null : r.GetString(3),
                        amount = amt,
                        kcalBase = cal,
                        kcalPer100g = kcal100
                    });
                }
                return Results.Json(new { query = raw, count = list.Count, results = list });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = "db_error", detail = ex.Message }, statusCode: 500);
            }
        });

        // ─── /api/fooddb/foods/{id} ───────────────────
        app.MapGet("/api/fooddb/foods/{id:long}", (long id) =>
        {
            try
            {
                if (!File.Exists(foodDbPath))
                    return Results.Json(new { error = "db_missing" }, statusCode: 503);
                using var con = new Microsoft.Data.Sqlite.SqliteConnection(FoodDbConnStr());
                con.Open();
                using var cmd = con.CreateCommand();
                cmd.CommandText =
                    "SELECT f.foodId, f.foodName, f.brand, f.catId, c.catName, f.amount, " +
                    "       f.calorie, f.protein, f.charbohydrate, f.fat, f.sugar, f.salt, " +
                    "       f.fibr, f.sodium, f.iron, f.cholesterol, " +
                    "       t1.type, t2.type, t3.type " +
                    "FROM foods f " +
                    "LEFT JOIN food_cats c ON c.catId = f.catId " +
                    "LEFT JOIN foods_type t1 ON t1.typeId = f.type1 " +
                    "LEFT JOIN foods_type t2 ON t2.typeId = f.type2 " +
                    "LEFT JOIN foods_type t3 ON t3.typeId = f.type3 " +
                    "WHERE f.foodId = $id AND f.status = 1";
                cmd.Parameters.AddWithValue("$id", id);
                using var r = cmd.ExecuteReader();
                if (!r.Read())
                    return Results.NotFound(new { error = "not_found", id });

                double amt = r.IsDBNull(5) ? 100.0 : r.GetDouble(5);
                if (amt <= 0) amt = 100.0;

                double? Per100(int idx)
                {
                    if (r.IsDBNull(idx)) return null;
                    double v = r.GetDouble(idx);
                    return v >= 0 ? (v * 100.0 / amt) : (double?)null;
                }

                long foodId = r.GetInt64(0);
                string name = r.GetString(1);
                string? brand = r.IsDBNull(2) ? null : r.GetString(2);
                int catId = r.IsDBNull(3) ? 0 : r.GetInt32(3);
                string? catName = r.IsDBNull(4) ? null : r.GetString(4);

                var units = new List<object>();
                var genericUnits = new List<object>();
                using (var gu = con.CreateCommand())
                {
                    gu.CommandText = "SELECT unitId, unitName, gram FROM food_units WHERE gram > 0 AND unitName <> 'گرم'";
                    using var gr = gu.ExecuteReader();
                    while (gr.Read()) genericUnits.Add(new { unitId = gr.GetInt32(0), unitName = gr.GetString(1), gram = gr.GetDouble(2) });
                }
                using (var uc = con.CreateCommand())
                {
                    uc.CommandText =
                        "SELECT u.unitId, u.unitName, v.gram " +
                        "FROM food_units_vals v JOIN food_units u ON u.unitId = v.unitId " +
                        "WHERE v.foodId = $id AND v.gram > 0";
                    uc.Parameters.AddWithValue("$id", foodId);
                    using var ur = uc.ExecuteReader();
                    while (ur.Read())
                        units.Add(new { unitId = ur.GetInt32(0), unitName = ur.GetString(1), gram = ur.GetDouble(2) });
                }

                return Results.Json(new
                {
                    id = foodId,
                    name,
                    brand,
                    categoryId = catId,
                    categoryName = catName,
                    amount = amt,
                    per100g = new
                    {
                        kcal = Per100(6),
                        protein = Per100(7),
                        carb = Per100(8),
                        fat = Per100(9),
                        sugar = Per100(10),
                        salt = Per100(11),
                        fiber = Per100(12),
                        sodium = Per100(13),
                        iron = Per100(14),
                        cholesterol = Per100(15)
                    },
                    types = new
                    {
                        type1 = r.IsDBNull(16) ? null : r.GetString(16),
                        type2 = r.IsDBNull(17) ? null : r.GetString(17),
                        type3 = r.IsDBNull(18) ? null : r.GetString(18)
                    },
                    householdUnits = units,
                    genericUnits = genericUnits
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = "db_error", detail = ex.Message }, statusCode: 500);
            }
        });

        // ─── /api/fooddb/exercises ────────────────────
        app.MapGet("/api/fooddb/exercises", (string? q, int? categoryId, int? limit) =>
        {
            try
            {
                if (!File.Exists(foodDbPath))
                    return Results.Json(new { error = "db_missing" }, statusCode: 503);
                int lim = Math.Clamp(limit ?? 20, 1, 50);
                string raw = (q ?? "").Trim();
                if (raw.Length > 100) raw = raw.Substring(0, 100);
                string nq = NormFa(raw);

                using var con = new Microsoft.Data.Sqlite.SqliteConnection(FoodDbConnStr());
                con.Open();
                using var cmd = con.CreateCommand();
                string where = "e.status = 1";
                if (categoryId.HasValue) where += " AND e.catId = $cat";

                if (nq.Length == 0)
                {
                    cmd.CommandText =
                        "SELECT e.exerciseId, e.exerciseName, e.catId, c.catName, e.MET " +
                        "FROM exercises e LEFT JOIN exercise_cat c ON c.catId = e.catId " +
                        "WHERE " + where + " ORDER BY e.exerciseId LIMIT $lim";
                }
                else
                {
                    string likeEsc = "%" + LikeEscape(nq) + "%";
                    string startEsc = LikeEscape(nq) + "%";
                    cmd.CommandText =
                        "SELECT e.exerciseId, e.exerciseName, e.catId, c.catName, e.MET, " +
                        "  CASE " +
                        "    WHEN " + NormSqlCol("e.exerciseName") + " = $exact THEN 0 " +
                        "    WHEN " + NormSqlCol("e.exerciseName") + " LIKE $start ESCAPE '\\' THEN 1 " +
                        "    WHEN " + NormSqlCol("e.exerciseName") + " LIKE $like  ESCAPE '\\' THEN 2 " +
                        "    ELSE 3 END AS rank " +
                        "FROM exercises e LEFT JOIN exercise_cat c ON c.catId = e.catId " +
                        "WHERE " + where + " AND " + NormSqlCol("e.exerciseName") + " LIKE $like ESCAPE '\\' " +
                        "ORDER BY rank ASC, LENGTH(e.exerciseName) ASC, e.exerciseId ASC LIMIT $lim";
                    cmd.Parameters.AddWithValue("$exact", nq);
                    cmd.Parameters.AddWithValue("$start", startEsc);
                    cmd.Parameters.AddWithValue("$like", likeEsc);
                }
                cmd.Parameters.AddWithValue("$lim", lim);
                if (categoryId.HasValue) cmd.Parameters.AddWithValue("$cat", categoryId.Value);

                var list = new List<object>();
                using var r = cmd.ExecuteReader();
                while (r.Read())
                {
                    double met = r.IsDBNull(4) ? -1.0 : r.GetDouble(4);
                    list.Add(new
                    {
                        id = r.GetInt64(0),
                        name = r.GetString(1),
                        categoryId = r.IsDBNull(2) ? 0 : r.GetInt32(2),
                        categoryName = r.IsDBNull(3) ? null : r.GetString(3),
                        met = met > 0 ? (double?)met : null
                    });
                }
                return Results.Json(new { query = raw, count = list.Count, results = list });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = "db_error", detail = ex.Message }, statusCode: 500);
            }
        });

        // ─── /api/fooddb/exercises/{id} ───────────────
        app.MapGet("/api/fooddb/exercises/{id:long}", (long id) =>
        {
            try
            {
                if (!File.Exists(foodDbPath))
                    return Results.Json(new { error = "db_missing" }, statusCode: 503);
                using var con = new Microsoft.Data.Sqlite.SqliteConnection(FoodDbConnStr());
                con.Open();
                using var cmd = con.CreateCommand();
                cmd.CommandText =
                    "SELECT e.exerciseId, e.exerciseName, e.catId, c.catName, e.MET " +
                    "FROM exercises e LEFT JOIN exercise_cat c ON c.catId = e.catId " +
                    "WHERE e.exerciseId = $id AND e.status = 1";
                cmd.Parameters.AddWithValue("$id", id);
                using var r = cmd.ExecuteReader();
                if (!r.Read())
                    return Results.NotFound(new { error = "not_found", id });
                double met = r.IsDBNull(4) ? -1.0 : r.GetDouble(4);
                return Results.Json(new
                {
                    id = r.GetInt64(0),
                    name = r.GetString(1),
                    categoryId = r.IsDBNull(2) ? 0 : r.GetInt32(2),
                    categoryName = r.IsDBNull(3) ? null : r.GetString(3),
                    met = met > 0 ? (double?)met : null
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = "db_error", detail = ex.Message }, statusCode: 500);
            }
        });
        // ─── static files ──────────────────────────
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(dataDir),
            RequestPath = "/data"
        });
        app.UseDefaultFiles(new DefaultFilesOptions
        {
            FileProvider = new PhysicalFileProvider(appDir),
            DefaultFileNames = new[] { "index.html" }
        });
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(appDir)
        });

        app.Start();
        return app;
    }

    [STAThread]
    static void Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.SetHighDpiMode(HighDpiMode.SystemAware);

        WebApplication? serverApp = null;
        var serverReady = new ManualResetEventSlim(false);
        Exception? startupError = null;

        // ─── سرور در یه thread کاملاً مستقل ───
        var serverThread = new Thread(() =>
        {
            try
            {
                SynchronizationContext.SetSynchronizationContext(null);
                serverApp = BuildAndStartServer();
                serverReady.Set();
                serverApp.WaitForShutdown();
            }
            catch (Exception ex)
            {
                startupError = ex;
                serverReady.Set();
            }
        });
        serverThread.IsBackground = true;
        serverThread.Start();

        if (!serverReady.Wait(8000))
        {
            MessageBox.Show("سرور در زمان مشخص بالا نیومد.", "Internship OS",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        if (startupError != null)
        {
            MessageBox.Show("سرور بالا نیومد:\n" + startupError.Message, "Internship OS",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        var rootDir = FindRoot();
        var appDir = Path.Combine(rootDir, "app");

        // ─── پنجره‌ی اصلی ───
        var form = new Form
        {
            Text = "Internship OS",
            Width = 1280,
            Height = 860,
            MinimumSize = new Size(800, 600),
            StartPosition = FormStartPosition.CenterScreen,
            BackColor = Color.FromArgb(10, 14, 19),
            FormBorderStyle = FormBorderStyle.Sizable,
            MinimizeBox = true,
            MaximizeBox = true,
            ControlBox = true,
            ShowIcon = true
        };

        try
        {
            var iconPath = Path.Combine(appDir, "brain.ico");
            if (File.Exists(iconPath))
                form.Icon = new Icon(iconPath);
        }
        catch { }

        var webView = new WebView2
        {
            Dock = DockStyle.Fill,
            DefaultBackgroundColor = Color.FromArgb(10, 14, 19)
        };
        form.Controls.Add(webView);

        form.Shown += async (sender, e) =>
        {
            try
            {
                var userDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "InternshipOS", "WebView2");
                Directory.CreateDirectory(userDataFolder);

                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder, null);
                await webView.EnsureCoreWebView2Async(env);

                webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
                webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                webView.CoreWebView2.Settings.IsZoomControlEnabled = true;

                webView.CoreWebView2.Navigate("http://127.0.0.1:8977");
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "WebView2 بالا نیومد:\n" + ex.Message +
                    "\n\nلطفاً Microsoft Edge WebView2 Runtime را نصب کنید:\n" +
                    "https://go.microsoft.com/fwlink/p/?LinkId=2124703",
                    "Internship OS", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        };

        form.FormClosed += (sender, e) =>
        {
            // Non-blocking shutdown — server thread is background, it'll die with the process
            _ = Task.Run(() =>
            {
                try { serverApp?.StopAsync(TimeSpan.FromMilliseconds(500)).Wait(1000); } catch { }
            });
        };

        Application.Run(form);
    }
}
