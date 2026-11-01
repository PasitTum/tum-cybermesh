---
name: integrate-tum-trust
description: ติดตั้งและเชื่อมต่อ Tum.Trust.Security (ThaID, DOPA และ Identity Providers อื่นๆ) เข้าสู่โปรเจกต์ปลายทาง (.NET 5.0, .NET 8.0, .NET 10.0) โดยการ Build และคัดลอกเฉพาะไฟล์ Tum.Trust.Security.dll ไปยังโฟลเดอร์ libs/ ของโปรเจกต์ปลายทาง เพื่อให้ติดขึ้น Git ของโปรเจกต์ปลายทางได้ทันทีโดยไม่ต้องพึ่งพา Repo ภายนอก
---

# Skill: Integrate Tum.Trust.Security (`integrate-tum-trust`)

คุณคือผู้เชี่ยวชาญการเชื่อมต่อระบบยืนยันตัวตนด้วย **Tum.Trust.Security** เข้าสู่โปรเจกต์ปลายทาง (Host Project)

---

## 🚨 กฎเหล็กสำคัญที่สุด 5 ข้อ

1. **Zero Host Package Mutation Rule (ห้ามแก้ NuGet เดิมของโปรเจกต์ปลายทาง):**
   - ห้ามอัปเกรด, ดาวน์เกรด, หรือลบ `<PackageReference>` เดิมที่มีอยู่ในโปรเจกต์ปลายทางเด็ดขาด เพราะจะกระทบระบบเดิมของโปรเจกต์ปลายทาง
   - `Tum.Trust.Security` รองรับ `net5.0`, `net8.0`, และ `net10.0` โดยใช้ Base Version (`5.0.0`, `8.0.0`, `10.0.0`) อยู่แล้ว หากเกิดปัญหาความเข้ากันได้ใดๆ ต้องปรับที่ฝั่ง SDK เท่านั้น ห้ามแก้แพ็กเกจของโปรเจกต์ปลายทาง

2. **No Hardcoded Machine Paths (ห้ามใช้ Absolute Path เฉพาะเครื่อง):**
   - ห้ามใส่ Path เฉพาะเครื่อง (เช่น `D:\Work\...` หรือ `C:\Users\...`) ลงในไฟล์ `.csproj` หรือโค้ดของโปรเจกต์ปลายทางเด็ดขาด เพราะแต่ละเครื่องและระบบ CI/CD มีโครงสร้างโฟลเดอร์ไม่เหมือนกัน
   - ต้องค้นหาตำแหน่งของ `Tum.Trust.Security` แบบ Dynamic และใช้ **Relative Path** เสมอ

3. **100% Full Provider Endpoint Rule (ห้ามตัดทอนฟีเจอร์ของ Provider):**
   - โปรเจกต์ `Tum.Trust.Security` คือ Middleware ตัวกลางของทีม รองรับทุก Endpoint ของทั้ง `IThaIdProvider` และ `IDopaProvider` ครบ 100% ห้ามสร้างคลาส HTTP ยิงตรงซ้ำซ้อนในโปรเจกต์ปลายทาง ให้เรียกผ่านเมธอดของ `IThaIdProvider` และ `IDopaProvider` เสมอ

4. **Append-Only Provider Documentation Rule (ห้ามลบข้อมูลอ้างอิงใน `docs/providers/`):**
   - ห้ามลบหรือเขียนทับข้อมูลอ้างอิงเดิมใน `<SDK_ROOT>/docs/providers/*.md` โดยเด็ดขาด

5. **Strict No-Secret In Docs Rule (ห้ามใส่ Key หรือ Secret จริงลงในเอกสารเด็ดขาด):**
   - ห้ามใส่ API Key, Client Secret, Consumer Secret, Private Key หรือ Secret จริงใดๆ ลงในโฟลเดอร์ `docs/providers/` โดยเด็ดขาด ให้ใช้ Placeholder เช่น `<YOUR_API_KEY>` หรือ `{{variable}}` เท่านั้น

6. **No Unsolicited Git Operations Rule (ห้ามดำเนินการใดๆ กับ Git หากผู้ใช้ไม่ได้สั่ง):**
   - **ห้าม** รันคำสั่งที่เปลี่ยนแปลงสถานะของ Git เช่น `git add`, `git commit`, `git push`, `git pull`, `git reset`, `git checkout`, `git branch`, `git stash` หรือ `git tag` เองโดยเด็ดขาด หากผู้ใช้ยังไม่ได้สั่งให้ดำเนินการอย่างชัดเจน

---

## ขั้นตอนการติดตั้งและเชื่อมต่อ (Step-by-Step Workflow)

### Step 1: ค้นหาตำแหน่งของ `Tum.Trust.Security` (`<SDK_ROOT>`) แบบอัตโนมัติ
ให้ค้นหาโฟลเดอร์ของโปรเจกต์ `tum-trust-security` (`<SDK_ROOT>`) ตามลำดับต่อไปนี้:
1. ตรวจสอบว่าในโปรเจกต์ปลายทางมีโฟลเดอร์ Submodule อยู่แล้วหรือไม่ เช่น `libs/tum-trust-security/Tum.Trust.Security.csproj` หรือ `submodules/tum-trust-security/Tum.Trust.Security.csproj`
2. ตรวจสอบว่าในไฟล์ `.csproj` ของโปรเจกต์ปลายทางมี `<ProjectReference>` ที่ชี้ไปยัง `Tum.Trust.Security.csproj` อยู่แล้วหรือไม่
3. ค้นหาในโฟลเดอร์ระดับเดียวกัน (Sibling Directory) เช่น `../tum-trust-security/Tum.Trust.Security.csproj` หรือ `../../tum-trust-security/Tum.Trust.Security.csproj`
4. หากยังไม่พบ ให้ใช้เครื่องมือค้นหาไฟล์ (`Glob` / `Find`) ค้นหาไฟล์ชื่อ `Tum.Trust.Security.csproj` ในโฟลเดอร์แม่ แล้วคำนวณ **Relative Path** จากโฟลเดอร์ของ `.csproj` ปลายทางไปยัง `Tum.Trust.Security.csproj` (หรือถาม Path/Git URL จากผู้ใช้หากอยู่นอก Workspace)

### Step 2: สำรวจโปรเจกต์ปลายทาง และอ่านเอกสาร Provider จาก `<SDK_ROOT>/docs/providers/`
1. ตรวจสอบไฟล์ `.csproj` ของโปรเจกต์ปลายทาง:
   - `<TargetFramework>` คือเวอร์ชันใด (`net5.0`, `net8.0`, `net10.0`)
   - รูปแบบการเขียน Startup (`Startup.cs` แบบ .NET 5 หรือ `Program.cs` แบบ .NET 8/10)
2. **อ่านเอกสาร Spec ของ Provider จาก `<SDK_ROOT>/docs/providers/`:**
   - อ่าน `<SDK_ROOT>/docs/providers/README.md` เพื่อดูรายชื่อ Providers ทั้งหมดที่มีใน SDK
   - อ่านไฟล์ `<SDK_ROOT>/docs/providers/thaid.md` และ/หรือ `<SDK_ROOT>/docs/providers/dopa.md` (หรือไฟล์ของ Provider อื่นๆ ที่ต้องการเชื่อม) เพื่อดู Config, เมธอดของ Interface และรายชื่อ Key ใน `VerificationResult.Data`

### Step 3: Build และคัดลอกเฉพาะไฟล์ `.dll` (`Tum.Trust.Security.dll`) เข้าสู่โฟลเดอร์ `libs/` ของโปรเจกต์ปลายทาง

เพื่อให้โปรเจกต์ปลายทางมีไฟล์ `Tum.Trust.Security.dll` ติดอยู่ใน Repository ของตัวเองเลย (เวลาคนอื่นในทีม `git clone` โปรเจกต์ปลายทางไป หรือรันบน CI/CD จะสามารถ Build และ Run ได้ทันที 100% โดยไม่ต้องมีโปรเจกต์ SDK ในเครื่อง และไม่ติดปัญหาสิทธิ์ข้าม Private Repo):

1. **สั่ง Build SDK ในโหมด `Release` ตาม `<TargetFramework>` ของโปรเจกต์ปลายทาง (`net5.0`, `net8.0`, หรือ `net10.0`):**
   ```powershell
   dotnet build "<SDK_ROOT>\Tum.Trust.Security.csproj" -c Release -f <TARGET_FRAMEWORK>
   ```
2. **สร้างโฟลเดอร์ `libs/` ในโปรเจกต์ปลายทาง แล้วคัดลอกเฉพาะไฟล์ `Tum.Trust.Security.dll` และ `Tum.Trust.Security.xml` (สำหรับแสดง IntelliSense Tooltip) ไปวาง:**
   - ต้นทาง: `<SDK_ROOT>\bin\Release\<TARGET_FRAMEWORK>\Tum.Trust.Security.dll` และ `Tum.Trust.Security.xml`
   - ปลายทาง: `<TARGET_PROJECT_DIR>\libs\Tum.Trust.Security.dll` และ `<TARGET_PROJECT_DIR>\libs\Tum.Trust.Security.xml`
   *(ตัว `Tum.Trust.Security.dll` ไม่มี Third-Party NuGet Dependency ภายนอก จึงใช้แค่ไฟล์ `.dll` ไฟล์เดียวจบ และไม่มีโค้ด `Tests` หรือ `MockServer` ติดไปด้วย)*
3. **ผูก `<Reference>` ในไฟล์ `.csproj` ของโปรเจกต์ปลายทางด้วย Relative Path:**
   ```xml
   <ItemGroup>
     <Reference Include="Tum.Trust.Security">
       <HintPath>libs\Tum.Trust.Security.dll</HintPath>
     </Reference>
   </ItemGroup>
   ```
4. **ตรวจสอบไฟล์ `.gitignore` ของโปรเจกต์ปลายทาง (สำคัญมากเพื่อให้ `.dll` ติดขึ้น Git ไปด้วย):**
   - หากใน `.gitignore` ของโปรเจกต์ปลายทางมีการบล็อก `*.dll` หรือ `libs/` ไว้ ให้เพิ่มบรรทัดยกเว้น (Unignore) ท้ายไฟล์ `.gitignore` ของโปรเจกต์ปลายทาง:
     ```gitignore
     !libs/
     !libs/Tum.Trust.Security.dll
     !libs/Tum.Trust.Security.xml
     ```
5. **กรณีโปรเจกต์ปลายทางใช้ `<Project SDK="Microsoft.NET.Sdk">` (เช่น Console / Worker / Class Library ที่ไม่ใช่ `Microsoft.NET.Sdk.Web`):**
   - ตรวจสอบว่ามี `Microsoft.Extensions.Http` ในโปรเจกต์ปลายทางแล้วหรือไม่ (สำหรับ `Microsoft.NET.Sdk.Web` มีมาให้ในตัวแล้ว ไม่ต้องเพิ่มอะไรเลย)

### Step 4 & Step 5: ตั้งค่า Configuration และลงทะเบียน Dependency Injection (`Program.cs` หรือ `Startup.cs`)

ให้ตรวจสอบก่อนว่าโปรเจกต์ปลายทางเก็บค่า Configuration ไว้ที่ใด (**ใน Database เช่นตาราง `variables` / `settings`** หรือ **ใน `appsettings.json`**) แล้วเลือกวิธีที่ตรงกับโปรเจกต์ปลายทาง:

#### รูปแบบ ก: กรณีโปรเจกต์ปลายทางเก็บค่า Config ไว้ใน Database (เช่นตาราง `variables` หรือ `settings`) — รองรับ Runtime Hot-Reload ในตัว
- **ข้อห้ามสำคัญ:** **ห้าม** สร้าง Interface `IIdentityOptionsProvider` ซ้ำขึ้นมาเองในโปรเจกต์ปลายทางเด็ดขาด! เพราะ `builder.Services.AddIdentityVerification((sp, options) => { ... })` ของ SDK จะสร้าง DI Scope ให้โดยอัตโนมัติและถูกเรียกอ่านค่าสดใหม่ทุกครั้งที่มีการเรียกใช้ Provider (เป็น **Runtime Hot-Reload ในตัวอยู่แล้ว**)
- เพียงเพิ่ม `using Tum.Trust.Security.Application;` ใน `Program.cs` แล้วดึงค่าจาก `DbContext` หรือ Repository ของโปรเจกต์ปลายทางโดยตรง:
  ```csharp
  using Tum.Trust.Security.Application;

  builder.Services.AddIdentityVerification((sp, options) =>
  {
      // SDK สร้าง Scope ให้แล้ว สามารถดึง Scoped DbContext หรือ Repository ได้โดยตรง
      var db = sp.GetRequiredService<KioskContext>();
      var vars = db.Variables.ToDictionary(v => v.Name, v => v.Value, StringComparer.OrdinalIgnoreCase);

      options.EncryptionKey = vars.GetValueOrDefault("identity_encryption_key");

      // รองรับเปิด/ปิดโหมดจำลองในตัว .dll (UseMock = true) จาก Database หรือ Environment ได้ทันที
      if (vars.TryGetValue("kiosk_identity_use_mock", out var mockVal))
          options.UseMock = mockVal == "1" || string.Equals(mockVal, "true", StringComparison.OrdinalIgnoreCase);
      if (vars.TryGetValue("kiosk_identity_mock_scenario", out var scenarioVal) && !string.IsNullOrWhiteSpace(scenarioVal))
          options.MockScenario = scenarioVal;

      // ThaID Settings (ครบทุก Endpoint และ API Key Header)
      options.ThaId.ClientId = vars.GetValueOrDefault("kiosk_thaid_client_id");
      options.ThaId.ClientSecret = vars.GetValueOrDefault("kiosk_thaid_client_secret");
      options.ThaId.AuthorizeUrl = vars.GetValueOrDefault("kiosk_thaid_authorize_url");
      options.ThaId.TokenUrl = vars.GetValueOrDefault("kiosk_thaid_token_url");
      options.ThaId.InspectUrl = vars.GetValueOrDefault("kiosk_thaid_inspect_url");
      options.ThaId.RevokeUrl = vars.GetValueOrDefault("kiosk_thaid_revoke_url");
      options.ThaId.UserInfoUrl = vars.GetValueOrDefault("kiosk_thaid_userinfo_url");
      options.ThaId.DiscoveryUrl = vars.GetValueOrDefault("kiosk_thaid_discovery_url");
      options.ThaId.JwksUrl = vars.GetValueOrDefault("kiosk_thaid_jwks_url");
      options.ThaId.Issuer = vars.GetValueOrDefault("kiosk_thaid_issuer");
      options.ThaId.ApiKey = vars.GetValueOrDefault("kiosk_thaid_api_key");
      options.ThaId.ApiKeyHeader = vars.GetValueOrDefault("kiosk_thaid_api_key_header") ?? "x-api-key";
      options.ThaId.RedirectUri = vars.GetValueOrDefault("kiosk_thaid_redirect_uri");
      options.ThaId.Scope = vars.GetValueOrDefault("kiosk_thaid_scope");

      // DOPA Settings (ครบทั้ง Card Laser, Card Chip, Biometric Face API และ OAuth Token)
      options.Dopa.VerificationUrl = vars.GetValueOrDefault("kiosk_dopa_verification_url");
      options.Dopa.LaserUrl = vars.GetValueOrDefault("kiosk_dopa_laser_url");
      options.Dopa.ChipUrl = vars.GetValueOrDefault("kiosk_dopa_chip_url");
      options.Dopa.FaceUrl = vars.GetValueOrDefault("kiosk_dopa_face_api_url");
      if (float.TryParse(vars.GetValueOrDefault("kiosk_dopa_face_threshold"), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var th))
          options.Dopa.FaceThreshold = th;
      options.Dopa.TokenUrl = vars.GetValueOrDefault("kiosk_dopa_token_url");
      options.Dopa.ClientId = vars.GetValueOrDefault("kiosk_dopa_client_id");
      options.Dopa.ClientSecret = vars.GetValueOrDefault("kiosk_dopa_client_secret");
      options.Dopa.ApiKey = vars.GetValueOrDefault("kiosk_dopa_api_key");
  });
  ```
- *(หมายเหตุ: เมื่อใช้ `AddIdentityVerification((sp, options) => ...)` ตัว SDK จะอ่านค่าเริ่มต้นจาก `IConfiguration` (`appsettings.json`) มารอไว้ให้ก่อนโดยอัตโนมัติ หากค่าใน DB ยังว่างเปล่าจะ Fallback ไปใช้ค่าใน `appsettings.json` ได้ทันที)*

#### รูปแบบ ข: กรณีโปรเจกต์ปลายทางเก็บค่า Config ใน `appsettings.json` (`IConfiguration`)
1. เพิ่ม Section `"IdentityVerification"` ลงใน `appsettings.json` (และใน `appsettings.Development.json` สามารถตั้ง `"UseMock": true` เพื่อทดสอบได้ทันทีโดยไม่ต้องมี Credentials จริง):
   ```json
   {
     "IdentityVerification": {
       "EncryptionKey": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
       "UseMock": false,
       "MockScenario": "success",
       "ThaId": {
         "ClientId": "<YOUR_THAID_CLIENT_ID>",
         "ClientSecret": "<YOUR_THAID_CLIENT_SECRET>",
         "AuthorizeUrl": "https://imauth.bora.dopa.go.th/api/v2/oauth2/auth/",
         "TokenUrl": "https://imauth.bora.dopa.go.th/api/v2/oauth2/token/",
         "InspectUrl": "https://imauth.bora.dopa.go.th/api/v2/oauth2/introspect/",
         "RevokeUrl": "https://imauth.bora.dopa.go.th/api/v2/oauth2/revoke/",
         "UserInfoUrl": "https://imauth.bora.dopa.go.th/api/v2/oauth2/userinfo/",
         "DiscoveryUrl": "https://imauth.bora.dopa.go.th/.well-known/openid-configuration",
         "JwksUrl": "https://imauth.bora.dopa.go.th/jwks/",
         "Issuer": "https://imauth.bora.dopa.go.th",
         "ApiKey": "",
         "ApiKeyHeader": "x-api-key",
         "RedirectUri": "https://localhost:5001/api/identity/thaid/callback",
         "Scope": "openid pid title title_en name name_en given_name family_name gender birthdate address house_address smartcard_code date_of_issuance date_of_expiry ial",
         "AllowUntrustedCertificates": false
       },
       "Dopa": {
         "VerificationUrl": "https://dopa-gateway.your-agency.local/api/v1/card/verify",
         "LaserUrl": "https://dopa-gateway.your-agency.local/api/v1/card/verify-laser",
         "ChipUrl": "https://dopa-gateway.your-agency.local/api/v1/card/verify-chip",
         "FaceUrl": "https://dopa-gateway.your-agency.local/api/v1/face/verify",
         "FaceThreshold": 0.80,
         "TokenUrl": "https://dopa-gateway.your-agency.local/oauth/token",
         "ClientId": "<YOUR_DOPA_CLIENT_ID>",
         "ClientSecret": "<YOUR_DOPA_CLIENT_SECRET>",
         "ApiKey": "<YOUR_DOPA_API_KEY>",
         "AllowUntrustedCertificates": false
       }
     }
   }
   ```
2. ลงทะเบียนใน `Program.cs` (หรือ `Startup.cs`):
   ```csharp
   using Tum.Trust.Security.Application;

   builder.Services.AddIdentityVerification(builder.Configuration);
   ```

### Step 6: สร้าง Service หรือ Controller เชื่อมต่อตามความต้องการของโปรเจกต์ปลายทาง

#### 6.1 กรณีเชื่อมต่อ ThaID (`IThaIdProvider` + `PkceHelper` + `ProviderHelper`)
- Namespaces ที่ใช้:
  ```csharp
  using Tum.Trust.Security.Core.Interfaces;
  using Tum.Trust.Security.Core.Models;
  using Tum.Trust.Security.Infrastructure.Helpers;
  using Tum.Trust.Security.Infrastructure.Security;
  ```
- **ตอนเริ่ม Login (`/thaid/login`):**
  ```csharp
  string codeVerifier = PkceHelper.GenerateCodeVerifier();
  string codeChallenge = PkceHelper.GenerateCodeChallenge(codeVerifier);
  string state = PkceHelper.GenerateState(); // หรือ PkceHelper.RandomUrlSafe(32)
  string nonce = PkceHelper.GenerateNonce();

  string authUrl = _thaIdProvider.GetAuthorizationUrl(
      redirectUri: "https://localhost:5001/api/identity/thaid/callback",
      state: state,
      codeChallenge: codeChallenge,
      codeChallengeMethod: "S256",
      nonce: nonce);
  ```
- **ตอนรับ Callback (`/thaid/callback`) และเมธอดทั้งหมดของ `IThaIdProvider`:**
  ```csharp
  VerificationResult result = await _thaIdProvider.ExchangeCodeAsync(
      authorizationCode: code,
      redirectUri: "https://localhost:5001/api/identity/thaid/callback",
      codeVerifier: codeVerifier,
      cancellationToken: ct);

  // เมธอดอื่นๆ ที่รองรับครบทุก Endpoint ของ ThaID:
  // - await _thaIdProvider.GetUserInfoAsync(accessToken, ct);
  // - await _thaIdProvider.RefreshTokenAsync(refreshToken, ct);
  // - await _thaIdProvider.InspectTokenAsync(accessToken, ct);
  // - await _thaIdProvider.RevokeTokenAsync(token, ct);
  // - await _thaIdProvider.GetOpenIdConfigurationAsync(ct);
  // - await _thaIdProvider.GetJwksAsync(ct);
  // - await _thaIdProvider.ValidateIdTokenAsync(idToken, expectedNonce, ct);

  string? pid = result.Data.GetStringValue("pid");
  string maskedPid = pid.MaskPid(); // เช่น "110050*****61"
  ```

#### 6.2 กรณีเชื่อมต่อ DOPA (`IDopaProvider`) — รองรับครบทั้ง Laser, Chip, Face 1:1 และ OAuth Token
- Inject `Tum.Trust.Security.Core.Interfaces.IDopaProvider`
- **1) ตรวจสอบด้วยข้อมูลหน้าบัตร + เลขหลังบัตร (`VerifyByLaserAsync`):**
  ```csharp
  VerificationResult result = await _dopaProvider.VerifyByLaserAsync(
      pid: request.Pid,           // เลขบัตร 13 หลัก (SDK เช็ค Modulo 11 ให้ในตัว)
      firstName: request.FirstName,
      lastName: request.LastName,
      birthDate: request.BirthDay, // พ.ศ. YYYYMMDD เช่น "25350131"
      laserId: request.LaserCode,  // เลขหลังบัตร เช่น "ME0123456789"
      cancellationToken: ct);
  ```
- **2) ตรวจสอบด้วยเลขบัตร + เลขชิปสมาร์ทการ์ด (`VerifyByChipAsync`):**
  ```csharp
  VerificationResult result = await _dopaProvider.VerifyByChipAsync(
      pid: request.Pid,
      chipNo: request.ChipNo,
      bp1No: request.Bp1No,
      cancellationToken: ct);
  ```
- **3) ตรวจสอบเปรียบเทียบใบหน้า 1:1 (`VerifyByFaceAsync`):**
  ```csharp
  VerificationResult faceResult = await _dopaProvider.VerifyByFaceAsync(
      pid: request.Pid,
      faceImageBase64: request.ImageBase64, // ตัด prefix "data:image/jpeg;base64," ให้อัตโนมัติ
      threshold: 0.80f,
      cancellationToken: ct);
  ```
- **4) ขอ OAuth 2.0 Access Token (`RequestAccessTokenAsync`):**
  *(โดยปกติ SDK จะขอและ Cache Token ให้อัตโนมัติเมื่อตั้งค่า `TokenUrl`, `ClientId`, และ `ClientSecret`)*
  ```csharp
  VerificationResult tokenResult = await _dopaProvider.RequestAccessTokenAsync(ct);
  ```

#### 6.3 กรณีต้องการดึง Provider จากรายการทั้งหมด (`IEnumerable<IVerificationProvider>`)
- สามารถ Inject `IEnumerable<IVerificationProvider>` แล้วค้นหาด้วย `providers.FirstOrDefault(p => string.Equals(p.ProviderName, "ThaID", StringComparison.OrdinalIgnoreCase))`

#### 6.4 กรณีผู้ใช้ต้องการทำ Mock Data / ทดสอบ Redirect และ QR Code (เมื่อยังไม่มี Credentials จริง หรือมีเฉพาะไฟล์ `.dll`)
- **กฎเหล็กด้านความปลอดภัย (ไม่ยุ่งกับโค้ดของโปรเจกต์ปลายทาง 100%):**
  - **ห้าม** สร้างคลาส `MockThaIdProvider`, `MockDopaProvider`, หรือสร้าง Mock Endpoints ใดๆ ลงในโค้ดของโปรเจกต์ปลายทางเด็ดขาด
  - ตัว `Tum.Trust.Security.dll` มี **Built-in Mock Mode (`UseMock = true`)** ฝังมาให้ในตัวแล้ว (และมี Standalone `MockServer` เป็นทางเลือกเสริม)

##### วิธีที่ 1 (แนะนำเมื่อส่งต่อเฉพาะไฟล์ `.dll`): เปิด `UseMock = true` ในตัว `Tum.Trust.Security.dll` ทันที (ไม่ต้องรัน Server แยก)
- เพียงตั้งค่า `UseMock = true` (ผ่าน Database `IdentityVerificationOptions` หรือผ่าน `appsettings.Development.json`) ตัว `ThaIdProvider` และ `DopaProvider` ใน `.dll` จะจำลองการทำงานทั้งหมดใน Memory ทันทีโดยไม่ต้องต่อเน็ตและไม่ต้องกรอก `ClientId`/`ClientSecret`/`ApiKey`:
  - **1) ตั้งค่าผ่าน Database (`Program.cs`):**
    ```csharp
    builder.Services.AddIdentityVerification((sp, options) =>
    {
        options.UseMock = true; // เปิดโหมดจำลองทั้ง ThaID และ DOPA ทันที (หรือดึงจาก DB flag)
        options.MockScenario = "success"; // "success" | "deny" | "invalid_state" | "expired_code" | "timeout"
        options.ThaId.RedirectUri = "https://localhost:5001/api/auth/thaid/callback";
    });
    ```
  - **2) หรือตั้งค่าผ่าน `appsettings.Development.json`:**
    ```json
    {
      "IdentityVerification": {
        "UseMock": true,
        "MockScenario": "success",
        "ThaID": {
          "RedirectUri": "https://localhost:5001/api/auth/thaid/callback"
        }
      }
    }
    ```
  - **การทำงานของ Loopback Redirect & QR Code เมื่อ `UseMock = true`:**
    - `GetAuthorizationUrl(redirectUri, state, ...)` จะคืนค่า **Loopback Callback URL** กลับไปยังหน้า Callback ของโปรเจกต์ปลายทางโดยตรง เช่น `https://localhost:5001/api/auth/thaid/callback?code=mock-auth-code-001&state=...`
    - **กรณี Kiosk นำ URL ไปวาด QR Code บนหน้าจอเอง** (เช่นใช้ `QRCoder` หรือ `qrcode.js`): จะได้รูป QR Code ตามปกติ 100% เมื่อสแกนหรือคลิกจะวิ่งเข้า Callback ของ Kiosk ทันที
    - **กรณี Browser สั่ง `Redirect(authUrl)`:** Browser จะวิ่งวนกลับเข้า Callback (`redirect_uri`) ของ Kiosk ทันทีพร้อม `code=mock-auth-code-001` และเมื่อเรียก `ExchangeCodeAsync` หรือ `VerifyAsync` จะได้รับข้อมูลจำลองประชาชนครบทั้ง **20 Scopes**

##### วิธีที่ 2 (ทางเลือกเสริมเมื่อต้องการเห็นหน้าเว็บจำลอง QR Code ของกรมการปกครอง): รัน Standalone Sandbox Mock Server (`<SDK_ROOT>/MockServer`)
1. **รัน Mock Server จากฝั่ง SDK (พอร์ตเริ่มต้น `http://localhost:5199`):**
   ```powershell
   dotnet run --project "<SDK_ROOT>/MockServer/Tum.Trust.MockServer.csproj"
   ```
   *(สามารถเปิดดูหน้า Dashboard และสถานะได้ที่ `http://localhost:5199`)*
2. **ชี้ URL ใน `appsettings.Development.json` หรือใน Database ของโปรเจกต์ปลายทางมายัง Mock Server (`UseMock = false`):**
   ```json
   {
     "IdentityVerification": {
       "ThaID": {
         "ClientId": "mock-client-id",
         "ClientSecret": "mock-client-secret",
         "AuthorizeUrl": "http://localhost:5199/api/v2/oauth2/auth/",
         "TokenUrl": "http://localhost:5199/api/v2/oauth2/token/",
         "InspectUrl": "http://localhost:5199/api/v2/oauth2/introspect/",
         "RevokeUrl": "http://localhost:5199/api/v2/oauth2/revoke/",
         "UserInfoUrl": "http://localhost:5199/api/v2/oauth2/userinfo/",
         "Scope": "openid pid title given_name family_name name birthdate address house_address smartcard_code"
       },
       "Dopa": {
         "LaserUrl": "http://localhost:5199/CheckCardByLaser",
         "ChipUrl": "http://localhost:5199/CheckCardByCID",
         "ApiKey": "mock-dopa-api-key"
       }
     }
   }
   ```
   *(ส่วนใน `appsettings.json` สำหรับ Production ยังคงใช้ URL จริงของกรมการปกครอง `https://imauth.bora.dopa.go.th/...` ตามปกติ)*
3. **การทำงานของ OAuth 2.0 Redirect (`HTTP 302 Found`) บน `<SDK_ROOT>/MockServer`:**
   - เมื่อโปรเจกต์ปลายทาง Redirect ผู้ใช้ไปที่ `http://localhost:5199/api/v2/oauth2/auth/...`:
     - **กรณีเปิดผ่าน Browser จริง:** จะแสดงหน้าจอจำลองแอป **ThaID Sandbox Simulator** ให้เลือกกดปุ่มจำลองสถานการณ์ (เช่น กดยินยอมสำเร็จ 20 Scopes, กดยกเลิก `access_denied`, จำลอง State ไม่ตรง CSRF, จำลอง Code หมดอายุ, หรือจำลอง Timeout) แล้วทำการ **`HTTP 302 Redirect`** กลับไปยัง `redirect_uri` ของโปรเจกต์ปลายทางทันที
     - **กรณีเรียกแบบอัตโนมัติ (ส่ง `?auto=true` หรือ `?scenario=success|deny|invalid_state|expired_code|timeout` หรือเรียกผ่าน `HttpClient`):** จะตอบกลับ **`HTTP 302 Found`** พร้อม Header `Location` กลับไปยัง `redirect_uri` ทันทีโดยไม่ต้องกดปุ่ม

##### ตารางมาตรฐาน 12 Use Cases ที่ `UseMock = true` (ใน `.dll`), `<SDK_ROOT>/MockServer` และ `<SDK_ROOT>/Tests` รองรับครบถ้วน

**1) ฝั่ง ThaID (`IThaIdProvider`) — 6 Use Cases:**

| รหัส | ชื่อสถานการณ์ (Scenario) | แหล่งที่มาและมาตรฐานอ้างอิง (Source & Standard) | เงื่อนไขทริกเกอร์บน MockServer | พฤติกรรมและผลลัพธ์ที่ได้รับ |
| :--- | :--- | :--- | :--- | :--- |
| **`UC-THAID-01`** | **Happy Path (OAuth 302 Redirect + PKCE + 20 Scopes)** | • [BORA ThaID OIDC Discovery](https://imauth.bora.dopa.go.th/.well-known/openid-configuration)<br>• [RFC 7636 (PKCE S256)](https://datatracker.ietf.org/doc/html/rfc7636)<br>• [RFC 6749 Sec 4.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1) | เลือกปุ่ม `✅ ยินยอมสำเร็จ` หรือ `?scenario=success` (`code = "mock-auth-code-001"`) | `/api/v2/oauth2/auth/` Redirect `302 Found` กลับไปที่ `redirect_uri` -> `/api/v2/oauth2/token/` ตรวจ PKCE (`S256`) ผ่าน และคืน `VerificationResult.Success(data)` ครบ 20 Scopes (`pid`: `"1234567890121"`, `title`: `"นาย"`, `title_en`: `"Mr."`, `given_name`: `"สมชาย"`, `family_name`: `"ใจดี"`, `name`: `"นาย สมชาย ใจดี"`, `name_en`: `"Mr. Somchai Jaidee"`, `gender`: `"male"`, `birthdate`: `"1990-01-31"`, `address`, `house_address`, `smartcard_code`: `"ME0123456789"`, `date_of_issuance`, `date_of_expiry`, `ial`: `2.3`, `access_token`, `refresh_token`, `id_token`, `token_type`: `"Bearer"`, `expires_in`: `3600`, `scope`) |
| **`UC-THAID-02`** | **Invalid / Mismatched State (CSRF Protection)** | • [RFC 6749 Sec 10.12 (CSRF)](https://datatracker.ietf.org/doc/html/rfc6749#section-10.12)<br>• NIST SP 800-63C Guidelines | เลือกปุ่ม `⚠️ จำลองค่า State ไม่ตรง` หรือ `?scenario=invalid_state` | Redirect `302 Found` กลับไปพร้อม `state=tampered-invalid-state` -> SDK คืน `ErrorCode = "INVALID_STATE"` ทันทีโดยไม่แลก Token |
| **`UC-THAID-03`** | **Expired / Invalid Authorization Code** | • [RFC 6749 Sec 5.2 (invalid_grant)](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2)<br>• OpenID Connect Core 1.0 Sec 3.1.2.6 | เลือกปุ่ม `⏰ จำลอง Code หมดอายุ` หรือ `?scenario=expired_code` (`code = "mock-expired-code"`) | `/api/v2/oauth2/token/` ตอบกลับ HTTP `400 Bad Request` (`{"error":"invalid_grant"}`) -> SDK คืน `ErrorCode = "TOKEN_EXCHANGE_FAILED"`, `HttpStatusCode = 400` |
| **`UC-THAID-04`** | **ThaID Server / Network Timeout** | • ISO/IEC 27001 Availability Control<br>• Microservices Timeout Pattern | เลือกปุ่ม `🔌 จำลองโครงข่ายล่ม` หรือ `?scenario=timeout` (`code = "mock-timeout"`) | `/api/v2/oauth2/token/` ตัดการเชื่อมต่อ -> SDK คืน `ErrorCode = "NETWORK_ERROR"` |
| **`UC-THAID-05`** | **Token Introspection & Revocation** | • [RFC 7662 (Token Introspection)](https://datatracker.ietf.org/doc/html/rfc7662)<br>• [RFC 7009 (Token Revocation)](https://datatracker.ietf.org/doc/html/rfc7009)<br>• BORA Introspect & Revoke Spec | เรียก `/api/v2/oauth2/introspect/` หรือ `/api/v2/oauth2/revoke/` | ถ้า `token == "mock-expired-token"` หรือถูก Revoke ไปแล้ว คืน `{"active": false}` / ถ้า Token ปกติคืน `{"active": true, "scope": "..."}` และ Revoke คืน `{"message": "revoked"}` |
| **`UC-THAID-06`** | **User Denied Consent on Redirect (กดยกเลิกในแอป ThaID)** | • [RFC 6749 Sec 4.1.2.1 (access_denied)](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1)<br>• ThaID Citizen Consent Cancellation Flow | เลือกปุ่ม `❌ ประชาชนกดยกเลิก` หรือ `?scenario=deny` | `/api/v2/oauth2/auth/` Redirect `302 Found` กลับไปที่ `${redirect_uri}?error=access_denied&error_description=User%20denied%20consent&state=${state}` และหากส่งเข้า `VerifyAsync` โดยไม่มี `code` จะคืน `ErrorCode = "MISSING_AUTH_CODE"` |

**2) ฝั่ง DOPA (`IDopaProvider`) — 6 Use Cases:**

| รหัส | ชื่อสถานการณ์ (Scenario) | แหล่งที่มาและมาตรฐานอ้างอิง (Source & Standard) | เงื่อนไขทริกเกอร์บน MockServer / SDK | พฤติกรรมและผลลัพธ์ที่ได้รับ |
| :--- | :--- | :--- | :--- | :--- |
| **`UC-DOPA-01`** | **Happy Path (สถานะปกติ - ทั้ง Laser และ Chip)** | • [DGA GDX Laser API kb.dga.or.th](https://kb.dga.or.th/gdx/5api-lasercode/)<br>• [BORA Laser Code Stat](https://stat.bora.dopa.go.th/card/smartcard4_5.htm)<br>• BORA CheckCard By CID Spec | `pid` ถูกหลัก Modulo 11 (เช่น `"1234567890121"`) และ `laserId` / `chipNo` ปกติ | คืน `VerificationResult.Success(data)` ที่มี `IsError: false`, `Code: 0`, `Desc: "สถานะปกติ"` |
| **`UC-DOPA-02`** | **Invalid PID Format / Checksum (Modulo 11 ไม่ผ่าน)** | • พ.ร.บ. การทะเบียนราษฎร<br>• มาตรฐานสากล ISO/IEC 7064 (MOD 11, 10)<br>• Thai National ID Verification Formula | `pid` ไม่ครบ 13 หลัก หรือหลักที่ 13 ไม่ตรงสูตร Modulo 11 (เช่น `"1234567890122"`) | SDK ตรวจจับและคืน `ErrorCode = "INVALID_PID_FORMAT"` ทันทีโดยไม่ยิง API |
| **`UC-DOPA-03`** | **Missing Parameters (ข้อมูลไม่ครบ)** | • ข้อกำหนดพารามิเตอร์ DGA API Specification<br>• BORA Gateway Input Schema Validation | ส่ง `firstName`, `lastName`, `birthDate`, `laserId`, `chipNo`, หรือ `bp1No` เป็นค่าว่าง | SDK ตรวจจับและคืน `ErrorCode = "MISSING_PARAMETERS"` ทันทีโดยไม่ยิง API |
| **`UC-DOPA-04`** | **Card Verification Rejected (เลขหลังบัตรไม่ตรง / บัตรถูกยกเลิก)** | • DOPA Gateway Error Code Standard (`Code: 1`)<br>• DGA GDX Result Schema (`IsError: true`) | `laserId == "ME9999999999"` หรือ `chipNo == "0000000000000000"` | MockServer ตอบกลับ `{"IsError": true, "ErrorMessage": "ไม่พบเลข Laser จาก PID นี้"}` -> SDK คืน `IsSuccess = false`, `ErrorCode = "CARD_VERIFICATION_REJECTED"` |
| **`UC-DOPA-05`** | **DOPA Gateway Unavailable (HTTP 503)** | • [RFC 7231 Sec 6.6.4 (HTTP 503)](https://datatracker.ietf.org/doc/html/rfc7231#section-6.6.4)<br>• DOPA Government Gateway High-Availability SLA | `laserId == "ME5000000000"` หรือ `chipNo == "5000000000000000"` | MockServer ตอบกลับ HTTP `503 Service Unavailable` -> SDK คืน `ErrorCode = "DOPA_API_FAILED"`, `HttpStatusCode = 503` |
| **`UC-DOPA-06`** | **Network / VPN Timeout** | • ISO/IEC 27001 Secure Gateway SLA<br>• Government Intranet VPN Connectivity Timeout | `laserId == "METIMEOUT000"` หรือ `chipNo == "TIMEOUT000000000"` | MockServer ตัดการเชื่อมต่อ -> SDK คืน `ErrorCode = "NETWORK_ERROR"` |

---

## Step 7: การตรวจสอบและ Build ยืนยันผล
1. รัน `dotnet build` ที่โปรเจกต์ปลายทาง ยืนยันว่า Build ผ่านเรียบร้อยโดยไม่มี Error
2. ตรวจสอบว่าไฟล์ `libs/Tum.Trust.Security.dll` (และ `libs/Tum.Trust.Security.xml`) อยู่ในโปรเจกต์ปลายทางเรียบร้อย ไม่ถูกบล็อกโดย `.gitignore` และในไฟล์ `.csproj` อ้างอิงผ่าน `<HintPath>libs\Tum.Trust.Security.dll</HintPath>` โดยไม่มีการแก้ไข `<PackageReference>` เดิม หรือเพิ่มโค้ด Mock ใดๆ ลงในโปรเจกต์ปลายทาง


