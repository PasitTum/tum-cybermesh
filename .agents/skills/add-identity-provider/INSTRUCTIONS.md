# add-identity-provider Skill — Detailed Instructions

เมื่อผู้ใช้เรียกใช้ `/add-identity-provider` ให้ปฏิบัติตามขั้นตอนต่อไปนี้อย่างเคร่งครัด

---

## ขั้นตอนที่ 1: การรับและค้นหาสเปก API (Flexible Spec Discovery)

### 1.1 รับข้อมูลจากผู้ใช้ (รองรับ 3 รูปแบบ):
- **เคส A — ผู้ใช้ส่ง URL:** ใช้ `WebFetch` ดึงเอกสาร API จากลิงก์นั้น แล้วสรุปรายการ Endpoints, HTTP Methods, Headers (`Basic`, `Bearer`, `ApiKey`), Request/Response JSON
- **เคส B — ผู้ใช้ส่งข้อความ/ไฟล์:** อ่านข้อมูล Endpoints, Parameters, Response จากข้อความหรือไฟล์โดยตรง
- **เคส C — ผู้ใช้บอกแค่ชื่อ Provider:** ใช้ `WebSearch` ค้นหา Official API Documentation ของ Provider นั้น แล้วดึงรายละเอียด Endpoints

### 1.2 จำแนกประเภท Provider:
- **Type A (OAuth 2.0 / OpenID Connect):**
  - มี Authorization URL Redirect ไปหน้า Login (`GetAuthorizationUrl`), แลก Code เป็น Token (`ExchangeCodeAsync`), ดึงข้อมูลโปรไฟล์ (`GetUserInfoAsync`), ต่ออายุ/ตรวจสอบ/ยกเลิก Token (`RefreshTokenAsync`, `InspectTokenAsync`, `RevokeTokenAsync`)
  - ต้นแบบอ้างอิง: `Core/Interfaces/IThaIdProvider.cs` และ `Infrastructure/Providers/ThaIdProvider.cs`
- **Type B (Direct REST / Hardware Verification):**
  - ยิง Request โดยตรง Server-to-Server (ไม่มีหน้า Redirect Login) โดยเมธอด `GetAuthorizationUrl` ให้โยน `throw new NotSupportedException(...)`
  - ต้นแบบอ้างอิง: `Core/Interfaces/IDopaProvider.cs` และ `Infrastructure/Providers/DopaProvider.cs`

---

## ขั้นตอนที่ 2: สร้างไฟล์ Interface + Provider Class

### 2.1 สร้าง Interface (`Core/Interfaces/I<Name>Provider.cs`)

Interface ทุกตัวต้องสืบทอดจาก `IVerificationProvider` ซึ่งบังคับเมธอดพื้นฐาน 3 ตัวคือ:
- `string ProviderName { get; }`
- `string GetAuthorizationUrl(string redirectUri, string state);`
- `Task<VerificationResult> VerifyAsync(VerificationRequest request, CancellationToken cancellationToken = default);`

**ตัวอย่างสำหรับ Type A (OAuth 2.0 / OIDC):**
```csharp
using Tum.Trust.Security.Core.Models;

namespace Tum.Trust.Security.Core.Interfaces;

/// <summary>
/// Defines the contract for <Name> (OAuth 2.0 / OIDC) identity verification operations.
/// </summary>
public interface I<Name>Provider : IVerificationProvider
{
    /// <summary>
    /// Generates the <Name> OAuth 2.0 authorization URL (with optional PKCE and OIDC nonce parameters).
    /// </summary>
    string GetAuthorizationUrl(
        string redirectUri,
        string state,
        string? codeChallenge,
        string codeChallengeMethod = "S256",
        string? nonce = null);

    /// <summary>
    /// Exchanges an OAuth 2.0 authorization code for tokens.
    /// </summary>
    Task<VerificationResult> ExchangeCodeAsync(
        string authorizationCode,
        string? redirectUri = null,
        string? codeVerifier = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Requests a new access token using a refresh token.
    /// </summary>
    Task<VerificationResult> RefreshTokenAsync(
        string refreshToken,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves user profile attributes from the UserInfo endpoint.
    /// </summary>
    Task<VerificationResult> GetUserInfoAsync(
        string accessToken,
        CancellationToken cancellationToken = default);
}
```

### 2.2 สร้าง Provider Class (`Infrastructure/Providers/<Name>Provider.cs`)

ต้องใช้ Constructor และ Helper ตามรูปแบบจริงของ SDK ดังนี้:
```csharp
using System.Net.Http.Headers;
using System.Text;
using Tum.Trust.Security.Core.Attributes;
using Tum.Trust.Security.Core.Exceptions;
using Tum.Trust.Security.Core.Interfaces;
using Tum.Trust.Security.Core.Models;
using Tum.Trust.Security.Infrastructure.Helpers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Tum.Trust.Security.Infrastructure.Providers;

/// <summary>
/// <Name> identity verification provider implementing <see cref="I<Name>Provider"/>.
/// </summary>
[AuditLog("IdentityVerification", "<Name>", Description = "Verify user identity with <Name>")]
public class <Name>Provider : I<Name>Provider
{
    /// <inheritdoc />
    public string ProviderName => "<Name>";

    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly string _authorizationUrl;
    private readonly string _tokenUrl;
    private readonly string? _defaultRedirectUri;
    private readonly string _scope;

    private readonly HttpClient _httpClient;
    private readonly IEncryptionService _encryptionService;
    private readonly ILogger<<Name>Provider> _logger;

    /// <summary>
    /// Initializes a new instance of <see cref="<Name>Provider"/>.
    /// </summary>
    public <Name>Provider(
        IConfiguration configuration,
        HttpClient httpClient,
        IEncryptionService encryptionService,
        ILogger<<Name>Provider> logger)
    {
        if (configuration is null) throw new ArgumentNullException(nameof(configuration));
        if (httpClient is null) throw new ArgumentNullException(nameof(httpClient));
        if (encryptionService is null) throw new ArgumentNullException(nameof(encryptionService));
        if (logger is null) throw new ArgumentNullException(nameof(logger));

        var section = configuration.GetSection("IdentityVerification:<Name>");

        _clientId = section.GetRequiredValue("ClientId");
        _clientSecret = section.GetRequiredValue("ClientSecret");
        _authorizationUrl = section.GetRequiredValue("AuthorizationUrl");
        _tokenUrl = section.GetRequiredValue("TokenUrl");
        _defaultRedirectUri = section["RedirectUri"];
        _scope = !string.IsNullOrWhiteSpace(section["Scope"])
            ? section["Scope"]!
            : "openid profile email";

        _httpClient = httpClient;
        _encryptionService = encryptionService;
        _logger = logger;
    }
    // ... ดูโค้ดเต็มใน TEMPLATES.md ...
}
```

### 2.3 กฎการใช้งาน Shared Helpers (`Reuse First, Customize When Needed`):
- ✅ **ใช้ `ProviderHelper` เป็นแกนหลักเสมอ:**
  - `section.GetRequiredValue("Key")` (เรียกผ่าน `IConfigurationSection`)
  - `ProviderHelper.ParseJsonToDictionary(json, "INVALID_<NAME>_RESPONSE")`
  - `ProviderHelper.CreateFailureResult(errorCode, message, httpStatusCode)`
  - `dictionary.GetStringValue("key1", "key2")` (ค้นหาแบบ `OrdinalIgnoreCase`)
  - `_logger.LogEncryptedPiiIfPresent(_encryptionService, ProviderName, responseData, "pid", "sub", "email")`
- ✅ **อนุญาตให้เขียน `private` helper เฉพาะในคลาส Provider ได้** เมื่อ API ของเจ้านั้นมีโครงสร้าง Error พิเศษ (เช่น HTTP 200 OK แต่ส่ง Error Flag มาใน JSON เหมือน DOPA) หรือต้องแกะ Nested JSON เฉพาะทาง แต่ผลลัพธ์สุดท้ายต้องสร้างผ่าน `ProviderHelper.CreateFailureResult(...)` เสมอ
- ✅ ทุก `public` class และ method ต้องมี XML Documentation (`/// <summary>`) เพราะโปรเจกต์เปิด `<GenerateDocumentationFile>true</GenerateDocumentationFile>`

---

## ขั้นตอนที่ 3: Cross-Version Compatibility Check (`net5.0`, `net8.0`, `net10.0`)

1. **ห้ามใช้ API ที่มีเฉพาะใน .NET 6+ / .NET 8+:**
   - ❌ `ArgumentNullException.ThrowIfNull(x);` $\rightarrow$ ✅ `if (x is null) throw new ArgumentNullException(nameof(x));`
   - ❌ `ArgumentException.ThrowIfNullOrWhiteSpace(s);` $\rightarrow$ ✅ `if (string.IsNullOrWhiteSpace(s)) throw new ArgumentException("...", nameof(s));`
   - ❌ `RandomNumberGenerator.GetBytes(32);` $\rightarrow$ ✅ `byte[] b = new byte[32]; RandomNumberGenerator.Fill(b);`
   - ❌ `SHA256.HashData(...)` / `HMACSHA256.HashData(...)` $\rightarrow$ ✅ `using var sha = SHA256.Create(); sha.ComputeHash(...)`
   - ❌ `char.IsAsciiLetterOrDigit(c)` $\rightarrow$ ✅ `(c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')`
2. **FormUrlEncodedContent บน .NET 5.0:**
   - ❌ `new FormUrlEncodedContent(formFields)` (เกิด Warning `CS8620` บน `net5.0`)
   - ✅ `new FormUrlEncodedContent(formFields.Select(kvp => new KeyValuePair<string?, string?>(kvp.Key, kvp.Value)))`
3. **ห้ามแก้ไข NuGet Versions ใน `Tum.Trust.Security.csproj`:**
   - ต้องคงเวอร์ชัน `5.0.0`, `8.0.0`, `10.0.0` เท่านั้น

---

## ขั้นตอนที่ 4: ลงทะเบียน Dependency Injection (`Application/DependencyInjection.cs`)

อัปเดตเมธอด `AddIdentityVerification` ใน `Application/DependencyInjection.cs`:
```csharp
// Register <Name> Provider (I<Name>Provider + IVerificationProvider)
ConfigureProviderHttpClient<<Name>Provider>(
    services,
    configuration,
    "IdentityVerification:<Name>:AllowUntrustedCertificates");
services.AddTransient<I<Name>Provider>(sp => sp.GetRequiredService<<Name>Provider>());
services.AddTransient<IVerificationProvider>(sp => sp.GetRequiredService<<Name>Provider>());
```

และเพิ่มตัวอย่างการตั้งค่าใน `appsettings.example.json`

---

## ขั้นตอนที่ 5: สร้าง Unit Tests (`Tests/<Name>ProviderTests.cs`)

> **สำคัญ:** โปรเจกต์ `Tests/Tum.Trust.Security.Tests.csproj` **ไม่ได้ใช้ `Moq`** ให้ใช้ `MockHttpMessageHandler`, `AesEncryptionService`, และ `NullLogger<<Name>Provider>.Instance` เหมือนใน `Tests/ThaIdProviderTests.cs` และ `Tests/DopaProviderTests.cs`

```csharp
using System.Security.Cryptography;
using Tum.Trust.Security.Core.Models;
using Tum.Trust.Security.Infrastructure.Providers;
using Tum.Trust.Security.Infrastructure.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Tum.Trust.Security.Tests;

public class <Name>ProviderTests
{
    private static IConfiguration CreateConfiguration()
    {
        var settings = new Dictionary<string, string?>
        {
            ["IdentityVerification:<Name>:ClientId"] = "test-client-id",
            ["IdentityVerification:<Name>:ClientSecret"] = "test-client-secret",
            ["IdentityVerification:<Name>:AuthorizationUrl"] = "https://provider.local/oauth/authorize",
            ["IdentityVerification:<Name>:TokenUrl"] = "https://provider.local/oauth/token",
            ["IdentityVerification:<Name>:UserInfoUrl"] = "https://provider.local/oauth/userinfo",
            ["IdentityVerification:<Name>:RedirectUri"] = "https://kiosk.local/callback"
        };

        return new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();
    }

    private static <Name>Provider CreateProvider(MockHttpMessageHandler handler)
    {
        byte[] keyBytes = new byte[32];
        RandomNumberGenerator.Fill(keyBytes);
        string key = Convert.ToBase64String(keyBytes);

        return new <Name>Provider(
            CreateConfiguration(),
            new HttpClient(handler),
            new AesEncryptionService(key),
            NullLogger<<Name>Provider>.Instance);
    }

    // ทดสอบ Happy Path, Missing Parameters, Error Response, และอัปเดต Tests/DependencyInjectionTests.cs
}
```

---

## ขั้นตอนที่ 6: สร้างเอกสารของ Provider ใน `docs/providers/<provider-name>.md`

ทุกครั้งที่เพิ่ม Provider ใหม่ ต้องสร้างไฟล์ `docs/providers/<provider-name-lowercase>.md` (ดูตัวอย่างจาก `docs/providers/thaid.md` และ `docs/providers/dopa.md`) โดยมีหัวข้อ:
1. ข้อมูลภาพรวม (`ProviderName`, `Config Section`, `Interface`, `Implementation`, มาตรฐานการเชื่อมต่อ)
2. การตั้งค่า `appsettings.json`
3. เมธอดและการรับส่งข้อมูล (`VerificationRequest` / `AdditionalParameters`)
4. ข้อมูลขาออกใน `VerificationResult.Data` (Pass-Through Keys)
5. รหัสข้อผิดพลาด (`result.ErrorCode`)
6. อัปเดตตารางใน `docs/providers/README.md` และ `README.md` หลักของโปรเจกต์

---

## ขั้นตอนที่ 7: Build & Test ยืนยันผลบนทั้ง 3 Runtimes

```powershell
dotnet test Tum.Trust.Security.sln
```
ต้องผ่านครบทั้ง `net5.0`, `net8.0`, และ `net10.0` ด้วย `0 Warning(s)` และ `0 Error(s)`
