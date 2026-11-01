# add-identity-provider Skill

ชุดคำสั่ง (Skill) สำหรับการสร้าง **Identity Provider ตัวใหม่** เข้าสู่โปรเจกต์ `TUM.Identity.SDK` โดยปฏิบัติตามกฎสถาปัตยกรรมของโปรเจกต์อย่างเคร่งครัด

## 📁 File Structure

```
.claude/skills/add-identity-provider/
├── README.md                 (ไฟล์นี้ — ภาพรวมและกฎหลัก)
├── SKILL.md                  (Entrypoint ของ Skill สำหรับ Claude Code)
├── INSTRUCTIONS.md           (ขั้นตอนปฏิบัติอย่างละเอียด)
├── TEMPLATES.md              (Code Templates ที่ตรงกับ C# Codebase 100%)
└── QUICK_START.md            (ตัวอย่างและ Checklist)
```

---

## 🔒 Key Architecture Rules

### 1️⃣ One-to-One Mapping (Interface → Provider)
```
Core/Interfaces/I<Name>Provider.cs  (inherits IVerificationProvider)
    ↓
Infrastructure/Providers/<Name>Provider.cs
```

### 2️⃣ Pass-Through Adapter
```
[Provider API Response]
    ↓
ProviderHelper.ParseJsonToDictionary(json, errorCode)
    ↓
VerificationResult.Data (100% unchanged, StringComparer.OrdinalIgnoreCase)
```

### 3️⃣ Reuse `ProviderHelper` First, Customize When Needed
```csharp
// ✅ ใช้ ProviderHelper เป็นแกนหลักเสมอ:
var section = configuration.GetSection("IdentityVerification:<Name>");
var clientId = section.GetRequiredValue("ClientId");
var data = ProviderHelper.ParseJsonToDictionary(json, "INVALID_<NAME>_RESPONSE");
var pid = data.GetStringValue("pid", "citizen_id");
var failure = ProviderHelper.CreateFailureResult("ERROR_CODE", "Message", (int)response.StatusCode);
_logger.LogEncryptedPiiIfPresent(_encryptionService, ProviderName, data, "pid", "citizen_id");

// ✅ อนุญาตให้สร้าง private helper ในคลาส Provider ได้เมื่อ API ต้นทางมี Error Format พิเศษ
// (เช่น HTTP 200 OK แต่มีฟิลด์ IsError = true ใน JSON) แต่สุดท้ายต้องคืนค่าผ่าน ProviderHelper.CreateFailureResult()
```

### 4️⃣ Cross-Version Compatibility (`net5.0;net8.0;net10.0`)
```csharp
// ❌ ห้ามใช้ (.NET 6+ only):
ArgumentNullException.ThrowIfNull(x);
RandomNumberGenerator.GetBytes(32);

// ✅ ให้ใช้ (.NET 5.0 / 8.0 / 10.0 compatible):
if (x is null) throw new ArgumentNullException(nameof(x));
byte[] bytes = new byte[32];
RandomNumberGenerator.Fill(bytes);

// ✅ ป้องกัน CS8620 บน .NET 5.0 เวลาใช้ FormUrlEncodedContent:
new FormUrlEncodedContent(
    formFields.Select(kvp => new KeyValuePair<string?, string?>(kvp.Key, kvp.Value)));
```

### 5️⃣ สร้างเอกสาร Provider ลงใน `docs/providers/<name>.md` ทุกครั้ง
ทุกครั้งที่เพิ่ม Provider ใหม่ ต้องสร้างไฟล์ `docs/providers/<name-lowercase>.md` และอัปเดต `docs/providers/README.md` เพื่อให้ Skill `integrate-TUM-identity` นำไปใช้อ้างอิงตอนติดตั้งในโปรเจกต์ปลายทาง
