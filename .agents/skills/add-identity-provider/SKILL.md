---
name: add-identity-provider
description: สร้าง Identity Verification Provider ใหม่เข้าสู่โปรเจกต์ Tum.Trust.Security โดยรับข้อมูลจาก URL, ข้อความ Spec, หรือค้นหาจากเว็บ พร้อมสร้าง Unit Tests (net5.0, net8.0, net10.0) และสร้างเอกสารอ้างอิงใน docs/providers/<provider-name>.md อัตโนมัติ
---

# Skill: Add Identity Verification Provider (`add-identity-provider`)

คุณคือสถาปนิกซอฟต์แวร์ผู้เชี่ยวชาญสำหรับโปรเจกต์ `Tum.Trust.Security`
เมื่อถูกเรียกใช้งาน ให้ศึกษาไฟล์คู่ขนานในโฟลเดอร์นี้ (`INSTRUCTIONS.md`, `TEMPLATES.md`, `QUICK_START.md`) และปฏิบัติตามขั้นตอนดังต่อไปนี้อย่างเคร่งครัด:

---

## Step 1: รวบรวมข้อมูล Specification ให้ครบ 100% (100% Complete Spec Ingestion — ห้ามตัดทอน Endpoint เด็ดขาด)
ตรวจสอบว่าผู้ใช้ส่งข้อมูลของ Provider ใหม่มาในรูปแบบใด:
1. **ส่งเป็น URL:** ใช้ `WebFetch` ดึงรายละเอียด **ทุก Endpoint**, HTTP Method, Headers, Authentication ทุกโหมด (OAuth2, PKCE, Client Credentials, Basic, Bearer, API Key Header), Request Payload และ Response JSON
2. **ส่งเป็นไฟล์หรือวางข้อความ Spec / cURL / JSON หรืออ้างอิงจากโปรเจกต์เดิม:** อ่านและวิเคราะห์จากข้อมูลทั้งหมดที่มีอยู่
3. **ระบุเฉพาะชื่อบริการ:** ใช้ `WebSearch` ค้นหา Official API Documentation ล่าสุดของบริการนั้น
4. **🚨 กฎเหล็ก: ห้ามเลือกทำเฉพาะบาง Endpoint (100% Full Provider Endpoint Coverage Rule):**
   - โปรเจกต์ `Tum.Trust.Security` คือ **Middleware ตัวกลางของทีม** ที่รวบรวม Identity Providers ทั้งหมดไว้ในที่เดียว
   - คุณ **ไม่มีสิทธิ์ตัดสินใจแทนผู้ใช้** ว่าจะเลือกทำเฉพาะบาง Endpoint หรือตัด Endpoint ใดทิ้ง
   - หากสเปกของ Provider มีกี่ Endpoint หรือมีวิธีส่งข้อมูลกี่รูปแบบ (เช่น OAuth2 Auth, Token, Refresh, Introspect, Revoke, UserInfo, Discovery, JWKS, ID Token Validation, Card Laser, Card Chip, Biometric Face Verification, Client Credentials Token ฯลฯ) **ต้องสร้างเมธอดใน Interface และ Implementation ให้รองรับครบ 100% ทุกตัว**
5. **จำแนกประเภท Provider:**
   - **Type A (OAuth 2.0 / OIDC):** มี Redirect Flow (`GetAuthorizationUrl`), Token Exchange (`ExchangeCodeAsync`), UserInfo (`GetUserInfoAsync`), Refresh/Inspect/Revoke Token, Discovery (`GetOpenIdConfigurationAsync`), JWKS (`GetJwksAsync`), และ ID Token Validation (`ValidateIdTokenAsync`) (ดูต้นแบบจาก `IThaIdProvider` และ `ThaIdProvider`)
   - **Type B (Direct Server-to-Server REST API):** ยิง API ตรวจสอบโดยตรง (ไม่ต้องมีเมธอด `GetAuthorizationUrl` ใน Interface เพราะ `IVerificationProvider` บังคับเฉพาะ `ProviderName` และ `VerifyAsync`) พร้อมสร้างเมธอดเฉพาะสำหรับทุกช่องทางการตรวจสอบของ Provider นั้น (ดูต้นแบบจาก `IDopaProvider` และ `DopaProvider` ที่รองรับครบทั้ง `VerifyByLaserAsync`, `VerifyByChipAsync`, `VerifyByFaceAsync`, และ `RequestAccessTokenAsync`)

---

## Step 2: กฎเหล็กทางสถาปัตยกรรม (Strict Architectural Rules)

1. **Multi-Targeting (`net5.0;net8.0;net10.0`) — Single Clean Codebase:**
   - ห้ามใช้ `#if NET5_0` หรือ `#if NET8_0` ในโค้ด C#
   - ห้ามใช้ API ที่มีเฉพาะใน .NET 6+ หรือ .NET 8+ เด็ดขาด:
     - ❌ ห้ามใช้ `ArgumentNullException.ThrowIfNull(...)` หรือ `ArgumentException.ThrowIfNullOrWhiteSpace(...)` -> ✅ ใช้ `if (x is null) throw new ArgumentNullException(nameof(x));`
     - ❌ ห้ามใช้ `RandomNumberGenerator.GetBytes(int)` -> ✅ ใช้ `byte[] bytes = new byte[n]; RandomNumberGenerator.Fill(bytes);`
     - ❌ ห้ามใช้ `HMACSHA256.HashData(...)`, `SHA256.HashData(...)`, `Aes.EncryptCbc(...)` -> ✅ ใช้ `using var sha256 = SHA256.Create(); sha256.ComputeHash(...)`
     - ❌ ห้ามใช้ `char.IsAsciiLetterOrDigit(c)` -> ✅ เช็คช่วงตัวอักษร `('A'-'Z', 'a'-'z', '0'-'9')` โดยตรง
   - เมื่อสร้าง `FormUrlEncodedContent` ต้องแปลงเป็น `KeyValuePair<string?, string?>` เสมอเพื่อป้องกัน Warning `CS8620` บน `net5.0`:
     ```csharp
     new FormUrlEncodedContent(formFields.Select(kvp => new KeyValuePair<string?, string?>(kvp.Key, kvp.Value)))
     ```

2. **ห้ามเพิ่มหรืออัปเกรด Third-Party NuGet Package (`Tum.Trust.Security.csproj`):**
   - ต้องคงเฉพาะ `Microsoft.Extensions.*` Base Version (`5.0.0`, `8.0.0`, `10.0.0`) ใน `Tum.Trust.Security.csproj` เท่านั้น ห้ามเพิ่ม Library ภายนอก เพื่อให้ผลลัพธ์การ Build เป็น Single-DLL (`Tum.Trust.Security.dll`) ที่นำไปวางในโฟลเดอร์ `libs/` ของโปรเจกต์ปลายทางได้ทันที

3. **Reuse `ProviderHelper` First, Customize When Needed:**
   - **ต้องใช้ `ProviderHelper` (`Tum.Trust.Security.Infrastructure.Helpers`) เป็นแกนหลักเสมอ:**
     - แปลง JSON Response เป็น Dictionary: `ProviderHelper.ParseJsonToDictionary(json, "INVALID_<NAME>_RESPONSE")`
     - ดึงค่าจาก Dictionary แบบ Case-Insensitive (`OrdinalIgnoreCase`): `dict.GetStringValue("key1", "key2")`
     - สร้างผลลัพธ์กรณี Error: `ProviderHelper.CreateFailureResult(errorCode, message, httpStatusCode)`
     - บันทึก Encrypted PII Vault Log: `_logger.LogEncryptedPiiIfPresent(_encryptionService, ProviderName, responseData, "pid", "citizen_id", "sub", "email")`
     - Mask ข้อมูลส่วนบุคคลเมื่อต้องแสดงผล: `value.Mask()` หรือ `pid.MaskPid()`

4. **Contract, Options & Built-in Mock Mode (`UseMock = true`) ต้องครบ 100%:**
   - Interface ใหม่ `I<Name>Provider` ต้องสืบทอดจาก `IVerificationProvider` (`Tum.Trust.Security.Core.Interfaces`) ซึ่งบังคับเฉพาะ:
     - `string ProviderName { get; }`
     - `Task<VerificationResult> VerifyAsync(VerificationRequest request, CancellationToken cancellationToken = default);`
     *(ใส่ `GetAuthorizationUrl(...)` เฉพาะใน `I<Name>Provider` ที่เป็น OAuth 2.0 / OIDC Redirect Flow เท่านั้น)*
   - เพิ่มคลาส `<Name>Options` ใน `Core/Models/IdentityVerificationOptions.cs` เพื่อรองรับทั้งการอ่านค่าจาก `appsettings.json` (`IConfiguration`) และการดึงค่าจาก Database (`IIdentityOptionsProvider`) พร้อมรองรับโหมดจำลองในตัว `UseMock = true` สำหรับทุกเมธอดของ Provider
   - ติด Attribute `[AuditLog("IdentityVerification", "<Name>", Description = "...")]` ที่ระดับคลาส และ `[AuditLog("<MethodName>", "<Name>", TrackDiff = false)]` ที่ทุกเมธอด
   - คลาส `VerificationResult` มีเฉพาะ Property: `IsSuccess`, `Message`, `ErrorCode`, `Error`, และ `Data` (ห้ามเขียน `result.ErrorMessage` หรือ `result.StatusCode` เพราะไม่มีอยู่จริง ให้ใช้ `ProviderHelper.CreateFailureResult`)

5. **🚨 กฎเหล็ก: ห้ามลบหรือเขียนทับข้อมูลอ้างอิงเดิมใน `docs/providers/` (Append-Only Provider Documentation Rule):**
   - เมื่ออัปเดตไฟล์ที่มีอยู่แล้วใน `docs/providers/<provider>.md` หรือ `docs/providers/README.md` **ห้ามใช้การเขียนทับ (`Overwrite: true`) ที่ลบข้อมูลอ้างอิงเดิมของ Provider ออกโดยเด็ดขาด!**
   - ข้อมูลแหล่งอ้างอิง (Live Discovery URL, JWKS URL, หมายเหตุของหน่วยงาน, รายชื่อ Scopes, โครงสร้าง OpenID Configuration, ตารางพารามิเตอร์ `VerifyAsync`, และตัวอย่างเดิม) ต้องถูกเก็บรักษาไว้ครบ 100% ทุกบรรทัด ให้ใช้วิธี **แก้ไขเฉพาะจุดหรือเพิ่มเติมหัวข้อใหม่ (Append/Expand)** เท่านั้น

6. **🚨 กฎเหล็ก: ห้ามใส่ Key หรือ Secret จริงลงในเอกสารเด็ดขาด (Strict No-Secret In Docs Rule):**
   - **ห้าม** นำ API Key, Consumer-Key, ConsumerSecret, Client Secret, Private Key, Encryption Key หรือ Secret จริงใดๆ มาใส่ลงในเอกสาร `docs/providers/*.md` หรือ `docs/providers/*.http` โดยเด็ดขาด
   - ตัวอย่างในเอกสารต้องใช้ **Placeholder เสมอ** เช่น `<YOUR_API_KEY>`, `<YOUR_CLIENT_SECRET>`, `{{variable}}` เท่านั้น

7. **ห้ามดำเนินการใดๆ กับ Git โดยไม่ได้รับคำสั่งจากผู้ใช้ (No Unsolicited Git Operations):**
   - **ห้าม** รันคำสั่งที่เปลี่ยนแปลงสถานะของ Git เช่น `git add`, `git commit`, `git push`, `git pull`, `git reset`, `git checkout`, `git branch`, `git stash` หรือ `git tag` เองโดยเด็ดขาด หากผู้ใช้ยังไม่ได้สั่งให้ดำเนินการอย่างชัดเจน

---

## Step 3: ขั้นตอนการสร้างโค้ดและ Unit Tests

1. **สร้าง/อัปเดต Options:** เพิ่ม `<Name>Options` ใน `Core/Models/IdentityVerificationOptions.cs`
2. **สร้าง Interface:** `Core/Interfaces/I<Name>Provider.cs` (สืบทอดจาก `IVerificationProvider` พร้อม XML Documentation ครบทุกเมธอดเพื่อป้องกัน Warning `CS1591`)
3. **สร้าง Provider Class:** `Infrastructure/Providers/<Name>Provider.cs` (รองรับ 3 Constructors: `IConfiguration`, `<Name>Options`, และ `IIdentityOptionsProvider` ตามต้นแบบ `ThaIdProvider.cs` และ `DopaProvider.cs`)
4. **ลงทะเบียน DI ใน `Application/DependencyInjection.cs`** ให้ครบทุก Overload
5. **สร้าง Unit Tests ใน `Tests/<Name>ProviderTests.cs`:**
   - **ห้ามใช้ `Moq`** ให้ใช้ `MockHttpMessageHandler`, `AesEncryptionService`, และ `NullLogger<<Name>Provider>.Instance` ทดสอบครบทุก Endpoint ทั้งโหมด HTTP จริงและโหมด `UseMock = true`

---

## Step 4: สร้างหรือเพิ่มเติมเอกสารอ้างอิงใน `docs/providers/<provider-name>.md` และไฟล์ `.http` (บังคับทำทุกครั้ง)

1. **สร้างหรือเพิ่มเติมไฟล์ `docs/providers/<provider-name-lowercase>.md`** (ตามโครงสร้างเดียวกับ `docs/providers/thaid.md` และ `docs/providers/dopa.md` โดย **ห้ามลบข้อมูลอ้างอิงเดิมที่มีอยู่แล้วเด็ดขาด**) ประกอบด้วย:
   - ข้อมูลภาพรวม (`ProviderName`, `Config Section`, `Interface`, `Implementation`, มาตรฐานการเชื่อมต่อ, ลิงก์เอกสารต้นฉบับ / Live Discovery URL / JWKS URL / หมายเหตุอ้างอิงทั้งหมด)
   - ข้อมูลจริงจาก API Specification ของ Provider (Endpoints ทั้งหมด, Grant Types, Auth Methods, Algorithms, Scopes)
   - ตัวอย่างการตั้งค่าทั้งใน `appsettings.json`, การดึงจาก Database (`IdentityVerificationOptions`), และโหมด `UseMock = true`
   - ตัวอย่างการเรียกใช้ **ครบทุกเมธอดใน Interface** รวมถึง `VerifyAsync(VerificationRequest)`
   - รายชื่อ Key ขาออกทั้งหมดใน `VerificationResult.Data` (Pass-Through Keys)
   - รหัสข้อผิดพลาด (`result.ErrorCode`) ทั้งหมด
   - **รายละเอียดแยกตามราย Endpoint (Per-Endpoint Request / Response Specification & VS Code REST Client):**
     - ต้องแยกหัวข้อของ **ทุก Endpoint ทีละตัว** โดยระบุเมธอดใน SDK, ตารางพารามิเตอร์ขาเข้า, บล็อกโค้ด `http` (สำหรับกด `Send Request` ด้วย VS Code Extension **REST Client** `humao.rest-client`), และตัวอย่าง JSON Response ทั้งกรณีสำเร็จ (`200 OK`) และกรณีเกิดข้อผิดพลาด (Error Response)
2. **สร้างไฟล์ทดสอบ `docs/providers/<provider-name-lowercase>.http`:**
   - สร้างไฟล์ `.http` คู่กันเสมอ (ตามต้นแบบ `docs/providers/thaid.http` และ `docs/providers/dopa.http`) โดยมีตัวแปร `@baseUrl` และแยกหัวข้อ `###` ของทุก Endpoint (ทั้ง Happy Path และ Error Cases) เพื่อให้ทีมนักพัฒนาคลิกปุ่ม `Send Request` ใน VS Code ทดสอบได้ทันที
3. **อัปเดตตารางสารบัญ** ใน `docs/providers/README.md`, `appsettings.example.json`, และ `README.md` หลักของโปรเจกต์

---

## Step 5: การตรวจสอบความถูกต้อง (Verification)
รันคำสั่งต่อไปนี้เพื่อยืนยันว่า Build และ Unit Tests ผ่านครบทั้ง 3 Runtimes (`net5.0`, `net8.0`, `net10.0`) ด้วย `0 Warning(s)` และ `0 Error(s)`:
```powershell
dotnet test Tum.Trust.Security.sln -c Release
```
