# Geant4 צעד אחר צעד

מדריך אינטראקטיבי בעברית ל-Geant4, ספריית מונטה קרלו להעברת חלקיקים בחומר. המדריך מסביר מה הסימולציה עושה בפנים ואיך עובדים איתה, למי שכבר מריצים אפליקציה של Geant4 ורוצים להבין כל שורה במאקרו, כל מספר בפלט וכל תמונה ב-GUI. הדוגמה שמלווה את כל הפרקים היא ldns, ממיר פרוטונים לנייטרונים של מקור נייטרונים מבוסס לייזר. בכל פרק קודם מנחשים, אחר כך רואים בהנפשה, ורק בסוף קוראים את הפקודה או את הנוסחה, עם פתרון מלא בשלבים לכל שאלה.

האתר: https://urielzanzuri-crypto.github.io/geant4-guide/

## מה יש באתר

שמונה פרקים, לפי הסדר שבו Geant4 עצמו עובד: מונטה קרלו (צעד, הגרלה, חתך פעולה, ולמה כל תוצאה היא מספר עם שגיאה); איך Geant4 בנוי (Run, Event, Track, Step, ואיפה הקוד שלנו נכנס); גיאומטריה וחומרים; פיזיקה (רשימות פיזיקה, מודלים ונתונים גרעיניים); המקור (ספקטרום, קונוס ומשקלים); מאקרו ושורת הפקודה; ויזואליזציה; ופלט וניתוח, מהטבלאות בקובץ ה-ROOT לגרף עם שגיאה בפייתון. בכל פרק: כרטיסי ניחוש עם הנפשה, כרטיס נוסחאות או פקודות, מגרש משחקים, אתגר עם כוכבים, מלכודות נפוצות, תרגילים, בוחן וכרטיס כיס. ההתקדמות נשמרת בדפדפן בלבד.

## איך פותחים מקומית

אין שלב בנייה. אפשר לפתוח את `index.html` ישירות בדפדפן, בלחיצה כפולה, או להריץ שרת קטן מתיקיית הפרויקט:

```
python3 -m http.server 8080
```

ואז לגלוש אל http://localhost:8080.

בדיקות: `node tests/chapter-check.mjs 01-montecarlo.html` בודק פרק שלם בכרום, ו-`tests/physics.html` מריץ את בדיקות הפיזיקה של המנוע ושל הפרקים (`?only=core` למנוע, `?only=01` לפרק). הפרטים ב-`CLAUDE.md`.

## מקורות ורישיון

האתר מבוסס על התיעוד הרשמי של Geant4 Collaboration: Book For Application Developers, Physics Reference Manual ו-Guide for Physics Lists, ועל הקוד הפתוח של Geant4 (https://geant4.web.cern.ch). Geant4 מופץ תחת Geant4 Software License. המאמרים: S. Agostinelli et al., Geant4: a simulation toolkit, NIM A 506 (2003) 250; J. Allison et al., Recent developments in Geant4, NIM A 835 (2016) 186.

הדוגמה המלווה, המספרים, קטעי הקוד והמאקרו והתמונות באים מהפרויקט ldns של הכותב ומהריצות שלו. קטעי הקוד מועתקים כלשונם ובקצרה; שום טקסט לא הועתק מהתיעוד. הטקסט, ההנפשות, התרגילים והפתרונות נכתבו בעברית מאפס.

## עוד בסדרה

- פיזיקה עם ניוטון החתול: https://urielzanzuri-crypto.github.io/physics-with-newton/
- אופטיקה: https://urielzanzuri-crypto.github.io/optics-course/
- פולסים קצרים: https://urielzanzuri-crypto.github.io/ultrafast-optics/
- אופטיקה לא-לינארית: https://urielzanzuri-crypto.github.io/nonlinear-optics/
- Geant4 צעד אחר צעד: https://urielzanzuri-crypto.github.io/geant4-guide/
