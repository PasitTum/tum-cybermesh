# add-identity-provider — Quick Start & Checklist

ตัวอย่างและ Checklist สำหรับการใช้งาน `/add-identity-provider`

---

## Example 1: OAuth 2.0 / OIDC Provider (Type A — เช่น Google, LINE, ThaID)

- **Interface (`Core/Interfaces/I<Name>Provider.cs`):** สืบทอดจาก `IVerificationProvider` มีเมธอด `GetAuthorizationUrl`, `ExchangeCodeAsync`, `RefreshTokenAsync`, `GetUserInfoAsync`, `VerifyAsync`
- **Implementation (`Infrastructure/Providers/<Name>Provider.cs`):** ติด `[AuditLog("IdentityVerification", "<Name>")]`
- **Configuration (`appsettings.json`):**
  ```json
  {
    "IdentityVerification": {
      "EncryptionKey": "REPLACE_WITH_BASE64_32_BYTE_KEY",
      "Google": {
        "ClientId": "<YOUR_CLIENT_ID>",
        "ClientSecret": "<YOUR_CLIENT_SECRET>",
        "AuthorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth",
        "TokenUrl": "https://oauth2.googleapis.com/token",
        "UserInfoUrl": "https://www.googleapis.com/oauth2/v2/userinfo",
        "RedirectUri": "https://your-app.local/signin-google",
        "Scope": "openid profile email",
        "AllowUntrustedCertificates": false
      }
    }
  }
  ```

---

## Example 2: Direct REST Verification (Type B — เช่น DOPA, Smart Card, DipChip)

- **Interface (`Core/Interfaces/I<Name>Provider.cs`):** สืบทอดจาก `IVerificationProvider` มีเมธอดเฉพาะทาง (เช่น `VerifyByLaserAsync`, `VerifyByChipAsync`) และ `VerifyAsync(VerificationRequest)`
- ใน `GetAuthorizationUrl(string redirectUri, string state)` ให้โยน `throw new NotSupportedException(...)`

---

## Master Checklist หลังรัน `/add-identity-provider`

- [ ] **1. Interface & Provider Class**
  - [ ] สร้าง `Core/Interfaces/I<Name>Provider.cs` ที่สืบทอดจาก `IVerificationProvider`
  - [ ] สร้าง `Infrastructure/Providers/<Name>Provider.cs` พร้อมติด `[AuditLog("IdentityVerification", "<Name>")]`
  - [ ] ใช้ `section.GetRequiredValue(...)`, `ProviderHelper.ParseJsonToDictionary(...)`, `ProviderHelper.CreateFailureResult(...)`, และ `_logger.LogEncryptedPiiIfPresent(...)`
  - [ ] มี XML Documentation (`/// <summary>`) ครบทุก Public class/method (ไม่มี `CS1591`)
- [ ] **2. Cross-Version Compatibility (`net5.0;net8.0;net10.0`)**
  - [ ] ไม่มี API ของ `.NET 6+` (`ThrowIfNull`, `RandomNumberGenerator.GetBytes`, `HashData`, `IsAsciiLetterOrDigit`)
  - [ ] ไม่ได้แก้ไขเวอร์ชัน NuGet ใน `Tum.Trust.Security.csproj`
- [ ] **3. Dependency Injection & Tests**
  - [ ] ลงทะเบียนใน `Application/DependencyInjection.cs`
  - [ ] สร้าง Unit Tests ใน `Tests/<Name>ProviderTests.cs` โดยใช้ `MockHttpMessageHandler`, `AesEncryptionService`, และ `NullLogger<<Name>Provider>.Instance`
  - [ ] เพิ่มการตรวจ DI Resolution ใน `Tests/DependencyInjectionTests.cs`
- [ ] **4. Provider Documentation (`docs/providers/`)**
  - [ ] สร้างไฟล์ `docs/providers/<name-lowercase>.md` สรุป Config, Input Parameters และ Output Keys ใน `VerificationResult.Data`
  - [ ] อัปเดต `docs/providers/README.md`, `appsettings.example.json`, และ `README.md`
- [ ] **5. Build & Test Verification**
  - [ ] รัน `dotnet test Tum.Trust.Security.sln` ผ่านครบทั้ง `net5.0`, `net8.0`, และ `net10.0` (0 Warnings, 0 Errors)
