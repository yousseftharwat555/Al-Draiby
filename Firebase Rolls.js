rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    // عدّل الـ UID ده لو عندك أدمن مختلف
    function isAdmin() {
      return isSignedIn() &&
             request.auth.uid == "JzTyBWiXvCdb2ntDc1QjEVSaHPP2";
    }

    /* ===================== users/{uid} ===================== */
    match /users/{uid} {

      // القراءة:
      // - الأدمن يقرأ أي شيء (وكده يقدر يعمل قائمة المستخدمين)
      // - المستخدم يقرأ وثيقته فقط (وبالتالي ما يقدرش يعمل list على الكولكشن كله)
      allow read: if isAdmin() || (isSignedIn() && request.auth.uid == uid);

      // إنشاء/تعديل:
      // - الأدمن: صلاحية كاملة
      // - المالك: مع قيود على الحقول الحساسة + قواعد الدعوة
      allow create, update: if isAdmin() || (
        isSignedIn() &&
        request.auth.uid == uid &&

        // (اختياري) فعّلها لو فعّلت التحقق من البريد
        // request.auth.token.email_verified == true &&

        // لو هيغيّر email لازم يطابق التوكن
        (!('email' in request.resource.data)
          || request.resource.data.email == request.auth.token.email) &&

        // منع العبث بالأدوار/الحالة من الواجهة (الأدمن فقط من يعدلهما)
        !('role' in request.resource.data) &&
        !('status' in request.resource.data) &&

        // referralId يتحدد مرة واحدة فقط + بصيغة ثابتة
        ( !('referralId' in request.resource.data)
          || ( !('referralId' in resource.data)
               && request.resource.data.referralId.matches('^EW-[A-Z0-9]{6}$') )
        ) &&

        // منع إحالة النفس لنفسه
        !( ('invitedByUid' in request.resource.data)
           && request.resource.data.invitedByUid == uid ) &&

        // قفل الدعوة بعد تعيينها (لا تغيير لاحق)
        !( ('invitedByUid' in resource.data)
           && ('invitedByUid' in request.resource.data)
           && resource.data.invitedByUid != null
           && request.resource.data.invitedByUid != resource.data.invitedByUid )
      );

      // الحذف: الأدمن أو المالك
      // (لو هتحذف من Auth نفسه استخدم Cloud Function)
      allow delete: if isAdmin() || (isSignedIn() && request.auth.uid == uid);

      /* --- referrals تحت صاحب الدعوة ---
         معرف المستند هو UID الخاص بالمدعو (inviteeUid)
      */
      match /referrals/{inviteeUid} {

        // القراءة: الأدمن، الداعي، أو المدعو
        allow read: if isAdmin()
                    || (isSignedIn() && (request.auth.uid == uid || request.auth.uid == inviteeUid));

        // الإنشاء: المدعو فقط + تحقّق بسيط
        allow create: if isSignedIn()
          && request.auth.uid == inviteeUid
          && request.resource.data.inviteeUid == inviteeUid
          && (!('viaReferralId' in request.resource.data)
              || request.resource.data.viaReferralId.matches('^EW-[A-Z0-9]{6}$'));

        // التعديل: المدعو فقط (لو بتسجل بيانات إضافية)
        allow update: if isSignedIn() && request.auth.uid == inviteeUid;

        // الحذف: الأدمن، الداعي، أو المدعو
        allow delete: if isAdmin()
          || (isSignedIn() && (request.auth.uid == uid || request.auth.uid == inviteeUid));
      }
    }

    /* ===================== blockedEmails/{emailLower} ===================== */
    match /blockedEmails/{emailId} {
      // منع listing بالكامل عشان ماحدّش "يعدّي" على الإيميلات
      allow list: if false;

      // مسموح get لأي حد — عشان الواجهة تقدر تسأل "هل الإيميل ده محظور؟"
      allow get: if true;

      // الكتابة (إنشاء/حذف) للأدمن فقط
      allow write: if isAdmin();
    }

    /* ===================== مجموعات أخرى حسب احتياجك ===================== */

    // أمثلة — عدّلها حسب مشروعك

    match /courses/{id} {
      allow read: if true;
      // الكتابة: للأدمن فقط
      allow write: if isAdmin();
    }

    match /codes/{codeId} {
      // لو أكواد عامة: اقراها لأي مستخدم مسجّل
      allow read: if isSignedIn();
      // الكتابة: للأدمن فقط (أو وسّع حسب استخدامك)
      allow write: if isAdmin();
    }
  }
}
