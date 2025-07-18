import{b as r,a as l,c,d as _}from"./index.7c030542.js";var f={lessThanXSeconds:{one:"أقل من ثانية",two:"أقل من ثانيتين",threeToTen:"أقل من {{count}} ثواني",other:"أقل من {{count}} ثانية"},xSeconds:{one:"ثانية واحدة",two:"ثانيتان",threeToTen:"{{count}} ثواني",other:"{{count}} ثانية"},halfAMinute:"نصف دقيقة",lessThanXMinutes:{one:"أقل من دقيقة",two:"أقل من دقيقتين",threeToTen:"أقل من {{count}} دقائق",other:"أقل من {{count}} دقيقة"},xMinutes:{one:"دقيقة واحدة",two:"دقيقتان",threeToTen:"{{count}} دقائق",other:"{{count}} دقيقة"},aboutXHours:{one:"ساعة واحدة تقريباً",two:"ساعتين تقريبا",threeToTen:"{{count}} ساعات تقريباً",other:"{{count}} ساعة تقريباً"},xHours:{one:"ساعة واحدة",two:"ساعتان",threeToTen:"{{count}} ساعات",other:"{{count}} ساعة"},xDays:{one:"يوم واحد",two:"يومان",threeToTen:"{{count}} أيام",other:"{{count}} يوم"},aboutXWeeks:{one:"أسبوع واحد تقريبا",two:"أسبوعين تقريبا",threeToTen:"{{count}} أسابيع تقريبا",other:"{{count}} أسبوعا تقريبا"},xWeeks:{one:"أسبوع واحد",two:"أسبوعان",threeToTen:"{{count}} أسابيع",other:"{{count}} أسبوعا"},aboutXMonths:{one:"شهر واحد تقريباً",two:"شهرين تقريبا",threeToTen:"{{count}} أشهر تقريبا",other:"{{count}} شهرا تقريباً"},xMonths:{one:"شهر واحد",two:"شهران",threeToTen:"{{count}} أشهر",other:"{{count}} شهرا"},aboutXYears:{one:"سنة واحدة تقريباً",two:"سنتين تقريبا",threeToTen:"{{count}} سنوات تقريباً",other:"{{count}} سنة تقريباً"},xYears:{one:"سنة واحد",two:"سنتان",threeToTen:"{{count}} سنوات",other:"{{count}} سنة"},overXYears:{one:"أكثر من سنة",two:"أكثر من سنتين",threeToTen:"أكثر من {{count}} سنوات",other:"أكثر من {{count}} سنة"},almostXYears:{one:"ما يقارب سنة واحدة",two:"ما يقارب سنتين",threeToTen:"ما يقارب {{count}} سنوات",other:"ما يقارب {{count}} سنة"}},u=function(a,i,s){var n=f[a],t;return typeof n=="string"?t=n:i===1?t=n.one:i===2?t=n.two:i<=10?t=n.threeToTen.replace("{{count}}",String(i)):t=n.other.replace("{{count}}",String(i)),s!=null&&s.addSuffix?s.comparison&&s.comparison>0?"خلال "+t:"منذ "+t:t};const m=u;var p={full:"EEEE، do MMMM y",long:"do MMMM y",medium:"d MMM y",short:"dd/MM/yyyy"},v={full:"HH:mm:ss",long:"HH:mm:ss",medium:"HH:mm:ss",short:"HH:mm"},h={full:"{{date}} 'عند الساعة' {{time}}",long:"{{date}} 'عند الساعة' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},b={date:r({formats:p,defaultWidth:"full"}),time:r({formats:v,defaultWidth:"full"}),dateTime:r({formats:h,defaultWidth:"full"})};const g=b;var w={lastWeek:"eeee 'الماضي عند الساعة' p",yesterday:"'الأمس عند الساعة' p",today:"'اليوم عند الساعة' p",tomorrow:"'غدا عند الساعة' p",nextWeek:"eeee 'القادم عند الساعة' p",other:"P"},y=function(a){return w[a]};const T=y;var P={narrow:["ق","ب"],abbreviated:["ق.م.","ب.م."],wide:["قبل الميلاد","بعد الميلاد"]},x={narrow:["1","2","3","4"],abbreviated:["ر1","ر2","ر3","ر4"],wide:["الربع الأول","الربع الثاني","الربع الثالث","الربع الرابع"]},M={narrow:["ي","ف","م","أ","م","ي","ي","أ","س","أ","ن","د"],abbreviated:["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],wide:["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]},$={narrow:["ح","ن","ث","ر","خ","ج","س"],short:["أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"],abbreviated:["أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"],wide:["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"]},W={narrow:{am:"ص",pm:"م",morning:"الصباح",noon:"الظهر",afternoon:"بعد الظهر",evening:"المساء",night:"الليل",midnight:"منتصف الليل"},abbreviated:{am:"ص",pm:"م",morning:"الصباح",noon:"الظهر",afternoon:"بعد الظهر",evening:"المساء",night:"الليل",midnight:"منتصف الليل"},wide:{am:"ص",pm:"م",morning:"الصباح",noon:"الظهر",afternoon:"بعد الظهر",evening:"المساء",night:"الليل",midnight:"منتصف الليل"}},k={narrow:{am:"ص",pm:"م",morning:"في الصباح",noon:"الظهر",afternoon:"بعد الظهر",evening:"في المساء",night:"في الليل",midnight:"منتصف الليل"},abbreviated:{am:"ص",pm:"م",morning:"في الصباح",noon:"الظهر",afternoon:"بعد الظهر",evening:"في المساء",night:"في الليل",midnight:"منتصف الليل"},wide:{am:"ص",pm:"م",morning:"في الصباح",noon:"الظهر",afternoon:"بعد الظهر",evening:"في المساء",night:"في الليل",midnight:"منتصف الليل"}},D=function(a){return String(a)},A={ordinalNumber:D,era:l({values:P,defaultWidth:"wide"}),quarter:l({values:x,defaultWidth:"wide",argumentCallback:function(a){return a-1}}),month:l({values:M,defaultWidth:"wide"}),day:l({values:$,defaultWidth:"wide"}),dayPeriod:l({values:W,defaultWidth:"wide",formattingValues:k,defaultFormattingWidth:"wide"})};const N=A;var F=/^(\d+)(th|st|nd|rd)?/i,C=/\d+/i,H={narrow:/[قب]/,abbreviated:/[قب]\.م\./,wide:/(قبل|بعد) الميلاد/},L={any:[/قبل/,/بعد/]},z={narrow:/^[1234]/i,abbreviated:/ر[1234]/,wide:/الربع (الأول|الثاني|الثالث|الرابع)/},E={any:[/1/i,/2/i,/3/i,/4/i]},X={narrow:/^[أيفمسند]/,abbreviated:/^(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)/,wide:/^(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)/},S={narrow:[/^ي/i,/^ف/i,/^م/i,/^أ/i,/^م/i,/^ي/i,/^ي/i,/^أ/i,/^س/i,/^أ/i,/^ن/i,/^د/i],any:[/^يناير/i,/^فبراير/i,/^مارس/i,/^أبريل/i,/^مايو/i,/^يونيو/i,/^يوليو/i,/^أغسطس/i,/^سبتمبر/i,/^أكتوبر/i,/^نوفمبر/i,/^ديسمبر/i]},V={narrow:/^[حنثرخجس]/i,short:/^(أحد|اثنين|ثلاثاء|أربعاء|خميس|جمعة|سبت)/i,abbreviated:/^(أحد|اثنين|ثلاثاء|أربعاء|خميس|جمعة|سبت)/i,wide:/^(الأحد|الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت)/i},R={narrow:[/^ح/i,/^ن/i,/^ث/i,/^ر/i,/^خ/i,/^ج/i,/^س/i],wide:[/^الأحد/i,/^الاثنين/i,/^الثلاثاء/i,/^الأربعاء/i,/^الخميس/i,/^الجمعة/i,/^السبت/i],any:[/^أح/i,/^اث/i,/^ث/i,/^أر/i,/^خ/i,/^ج/i,/^س/i]},I={narrow:/^(ص|م|منتصف الليل|الظهر|بعد الظهر|في الصباح|في المساء|في الليل)/,any:/^(ص|م|منتصف الليل|الظهر|بعد الظهر|في الصباح|في المساء|في الليل)/},Y={any:{am:/^ص/,pm:/^م/,midnight:/منتصف الليل/,noon:/الظهر/,afternoon:/بعد الظهر/,morning:/في الصباح/,evening:/في المساء/,night:/في الليل/}},O={ordinalNumber:c({matchPattern:F,parsePattern:C,valueCallback:function(a){return parseInt(a,10)}}),era:_({matchPatterns:H,defaultMatchWidth:"wide",parsePatterns:L,defaultParseWidth:"any"}),quarter:_({matchPatterns:z,defaultMatchWidth:"wide",parsePatterns:E,defaultParseWidth:"any",valueCallback:function(a){return a+1}}),month:_({matchPatterns:X,defaultMatchWidth:"wide",parsePatterns:S,defaultParseWidth:"any"}),day:_({matchPatterns:V,defaultMatchWidth:"wide",parsePatterns:R,defaultParseWidth:"any"}),dayPeriod:_({matchPatterns:I,defaultMatchWidth:"any",parsePatterns:Y,defaultParseWidth:"any"})};const q=O;var B={code:"ar",formatDistance:m,formatLong:g,formatRelative:T,localize:N,match:q,options:{weekStartsOn:6,firstWeekContainsDate:1}};const Q=B;function o(e){return`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>إحالة على الأجر تجارية</title>
      <style>
        @font-face {
          font-family: 'Amiri';
          src: url('/Amiri-Regular.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'Amiri';
          src: url('/fonts/Amiri-Bold.ttf') format('truetype');
          font-weight: bold;
          font-style: normal;
        }
        @font-face {
          font-family: 'Amiri';
          src: url('/Amiri-Italic.ttf') format('truetype');
          font-weight: normal;
          font-style: italic;
        }
        @font-face {
          font-family: 'Amiri';
          src: url('/Amiri-BoldItalic.ttf') format('truetype');
          font-weight: bold;
          font-style: italic;
        }
        
        body {
          font-family: 'Amiri', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          margin: 40px;
          direction: rtl;
          text-align: right;
        }
        
        .header {
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 20px;
        }
        
        .subheader {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 20px;
        }
        
        .section-header {
          font-size: 14px;
          font-weight: bold;
          margin: 20px 0 10px 0;
        }
        
        .field {
          margin-bottom: 8px;
        }
        
        .field-label {
          font-weight: bold;
          display: inline;
        }
        
        .field-value {
          display: inline;
        }
        
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          text-align: center;
        }
        
        .signature-box {
          width: 30%;
          text-align: center;
        }
        
        .court-signature {
          text-align: center;
          margin-top: 20px;
        }
        
        .agreement-text {
          margin: 20px 0;
          line-height: 1.8;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">إحالة على الأجر تجارية</div>
      <div class="subheader">(في إطار قانون البيع بالتقسيط)</div>
      
      <div class="section-header">مراجع الإحالة بسجلات المحكمة:</div>
      <div class="field">
        <span class="field-label">محكمة الناحية: </span>
        <span class="field-value">${e.courtName||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">الدفتر: </span>
        <span class="field-value">${e.bookNumber||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">الصفحة: </span>
        <span class="field-value">${e.pageNumber||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">التاريخ: </span>
        <span class="field-value">${e.date||"_________________"}</span>
      </div>
      
      <div class="section-header">البيانات المتعلقة بالمزود:</div>
      <div class="field">
        <span class="field-label">المعرف الجبائي: </span>
        <span class="field-value">${e.supplierTaxId||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">هوية المزود: </span>
        <span class="field-value">${e.supplierName||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">العنوان: </span>
        <span class="field-value">${e.supplierAddress||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">رقم الحساب البنكي للمزود: </span>
        <span class="field-value">${e.supplierBankAccount||"_________________"}</span>
      </div>
      
      <div class="section-header">البيانات المتعلقة بالعون العمومي:</div>
      <div class="field">
        <span class="field-label">المعرف الوحيد: </span>
        <span class="field-value">${e.workerNumber||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">الإسم واللقب: </span>
        <span class="field-value">${e.fullName||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">رقم بطاقة التعريف الوطنية: </span>
        <span class="field-value">${e.cin||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">العنوان الشخصي: </span>
        <span class="field-value">${e.address||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">الهيكل الإداري المنتمي اليه: </span>
        <span class="field-value">${e.workplace||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">الرتبة: </span>
        <span class="field-value">${e.jobTitle||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">الوضعية المهنية: </span>
        <span class="field-value">مباشر</span>
      </div>
      <div class="field">
        <span class="field-label">رقم الحساب البنكي أو البريدي: </span>
        <span class="field-value">${e.bankAccountNumber||"_________________"}</span>
      </div>
      
      <div class="section-header">البيانات المتعلقة بالبضاعة المقتناة:</div>
      <div class="field">
        <span class="field-label">ذكر طبيعة البضاعة المقتناة بكل دقة: </span>
        <span class="field-value">${e.itemDescription||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">المبلغ الجملي للبضاعة المقتناة بلسان القلم: </span>
        <span class="field-value">${e.amountInWords||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">المبلغ الجملي للبضاعة المقتناة بالأرقام: </span>
        <span class="field-value">${e.totalAmountNumeric||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">المبلغ الشهري المقتطع من الراتب بالأرقام: </span>
        <span class="field-value">${e.monthlyPayment||"_________________"}</span>
      </div>
      <div class="field">
        <span class="field-label">مدة الاقتطاع من الأجر: </span>
        <span class="field-value">18 شهرا</span>
      </div>
      <div class="field">
        <span class="field-label">تاريخ بداية سريان أول اقتطاع من الأجر: </span>
        <span class="field-value">${e.firstDeductionMonthArabic||"_________________"}</span>
      </div>
      
      <div class="section-header">محتوى الاتفاق:</div>
      <div class="agreement-text">
        بمقتضى هذه الإحالة يأذن السيد الأمين العام للمصاريف لدى ${e.workplace||"_________________"} الاقتطاع شهريا من راتبه المبلغ المذكور أعلاه و تحويله حسب الطرق الإجرائية المعتمدة للمزود ${e.supplierName||"_________________"} حتى الخلاص النهائي ما لم تطرأ موانع قانونية أو مهنية أو غيرها تحول دون ذلك.
      </div>
      
      <div class="signature-section">
        <div class="signature-box">امضاء المزود وختمه</div>
        <div class="signature-box">امضاء المدين</div>
        <div class="signature-box">ختم المؤجر</div>
      </div>
      
      <div class="court-signature">ختم المحكمة و الإمضاء</div>
    </body>
    </html>
  `}async function d(e){const a=window.open("","_blank");a.document.write(e),a.document.close(),await new Promise(i=>{a.addEventListener("load",()=>{setTimeout(i,1e3)})}),a.print(),setTimeout(()=>{a.close()},1e3)}function G(e){const a=o(e);d(a)}function U(e){const a=o(e);d(a)}export{Q as a,U as d,G as o};
