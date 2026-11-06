import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Code,
  Compass,
  Info,
  Lightbulb,
  Microphone,
  ShieldCheck,
  Sparkle,
} from '@phosphor-icons/react';
import { useI18n } from '../i18n';

const GUIDE_PAGES = [
  {
    stepNumber: '01',
    id: 'login',
    route: '/login',
    image: '/screenshots/01-login-page.png',
    en: {
      title: 'Step 1: Sign-In & Workspace Entry (/login)',
      subtitle: 'Where engineers log in and connect to their protected codebase',
      beginnerSummary:
        'Think of this page as the security gate at the entrance of a hospital or bank. Before anyone can inspect code or record voice rules, they sign in here so WhyLine knows which engineer is speaking and which codebase to protect.',
      realWorldExample:
        'Real-Life Example: Just like tapping your employee ID badge at the office front door so the building knows your name, language preference, and department.',
      sections: [
        {
          name: '1. Top Bar (Brand, Language Switcher & Theme Toggle)',
          purpose:
            'Lets you switch the entire application between English (EN), Telugu (తెలుగు), and Hindi (हिंदी), or toggle Light/Dark mode before you even log in.',
        },
        {
          name: '2. Left Security Overview Card ("Protected by Chesterton\'s Fence")',
          purpose:
            'Explains the core rule of WhyLine: never delete a strange-looking piece of code until you understand WHY it was put there in the first place.',
        },
        {
          name: '3. Sign-In Form & One-Click Demo Login',
          purpose:
            'Authenticates the engineer (@anjani) and loads the active repository (HealthConnect or Whyline) along with its saved voice rules.',
        },
      ],
    },
    te: {
      title: 'దశ 1: సైన్-ఇన్ & వర్క్‌స్పేస్ ప్రవేశం (/login)',
      subtitle: 'ఇంజనీర్లు లాగిన్ అయ్యి తమ కోడ్‌బేస్‌కు కనెక్ట్ అయ్యే మొదటి పేజీ',
      beginnerSummary:
        'ఈ పేజీని ఒక ఆసుపత్రి లేదా బ్యాంకు ముందు ఉండే సెక్యూరిటీ గేట్ లాగా ఊహించుకోండి. కోడ్‌ను చూడటానికి లేదా వాయిస్ నోట్స్ రికార్డ్ చేయడానికి ముందు ఇక్కడ లాగిన్ అవుతారు.',
      realWorldExample:
        'ఉదాహరణ: ఆఫీస్ లోపలికి వెళ్లే ముందు మీ ID కార్డ్ స్వైప్ చేయడం లాంటిది—దీనివల్ల ఎవరు మాట్లాడుతున్నారో మరియు ఏ భాషలో చూపించాలో సిస్టమ్‌కు తెలుస్తుంది.',
      sections: [
        {
          name: '1. టాప్ బార్ (భాష మార్పు & థీమ్ బటన్)',
          purpose:
            'లాగిన్ అవ్వకముందే యాప్ మొత్తాన్ని ఇంగ్లీష్, తెలుగు లేదా హిందీలోకి మార్చడానికి ఉపయోగపడుతుంది.',
        },
        {
          name: '2. ఎడమవైపు భద్రతా వివరణ కార్డ్',
          purpose:
            'కోడ్‌లో ఉన్న పాత ఫిక్స్ ఎందుకు పెట్టారో తెలియకుండా దాన్ని తొలగించకూడదు అనే ముఖ్య ఉద్దేశాన్ని వివరిస్తుంది.',
        },
        {
          name: '3. సైన్-ఇన్ ఫారమ్',
          purpose:
            'ఇంజనీర్‌ను ధృవీకరించి నేరుగా మెయిన్ డ్యాష్‌బోర్డ్‌లోకి తీసుకెళ్తుంది.',
        },
      ],
    },
    hi: {
      title: 'चरण 1: साइन-इन और वर्कस्पेस प्रवेश (/login)',
      subtitle: 'जहाँ इंजीनियर लॉगिन करते हैं और अपने सुरक्षित कोडबेस से जुड़ते हैं',
      beginnerSummary:
        'इस पेज को किसी अस्पताल या बैंक के मुख्य सुरक्षा गेट की तरह समझें। कोड देखने या वॉइस नियम रिकॉर्ड करने से पहले यहाँ साइन-इन किया जाता है।',
      realWorldExample:
        'उदाहरण: जैसे ऑफिस में प्रवेश करते समय अपना आईडी कार्ड टैप करना ताकि सिस्टम को पता चले कि कौन काम कर रहा है और किस भाषा में जानकारी दिखानी है।',
      sections: [
        {
          name: '1. टॉप बार (भाषा चयन और थीम बटन)',
          purpose:
            'लॉगिन करने से पहले ही पूरे ऐप को अंग्रेजी, तेलुगु या हिंदी में बदलने के लिए उपयोग किया जाता है।',
        },
        {
          name: '2. बायाँ सुरक्षा परिचय कार्ड',
          purpose:
            'बताता है कि जब तक यह पता न चले कि कोई पुराना कोड क्यों लिखा गया था, तब तक उसे हटाना नहीं चाहिए।',
        },
        {
          name: '3. साइन-इन फ़ॉर्म',
          purpose:
            'इंजीनियर की पहचान सत्यापित करके मुख्य डैशबोर्ड खोलता है।',
        },
      ],
    },
  },
  {
    stepNumber: '02',
    id: 'briefing',
    route: '/',
    image: '/screenshots/02-briefing-dashboard.png',
    en: {
      title: 'Step 2: Codebase Guard & Fence Briefing Dashboard (/)',
      subtitle: 'Your main control center showing protected code rules, live metrics, and the 90-second demo',
      beginnerSummary:
        'This is your home dashboard—like the main instrument cluster on a car dashboard. At a single glance, it tells you how many tricky code workarounds ("Fences") were found, which ones urgently need a human voice explanation, and how many risky AI edits were blocked.',
      realWorldExample:
        'Real-Life Example: Imagine a hospital nurse station board showing: 6 patients have complete medical charts (Active Fences), 4 need a doctor\'s voice note (Pending Notes), and 10 wrong prescriptions were automatically stopped (Blocked Breaks).',
      sections: [
        {
          name: '1. Priority Workaround Alert Banner (Top Highlight Box)',
          purpose:
            'Highlights the #1 most urgent code workaround right now (PR #212 Payment Settlement retryCount = 5) with a 1-click "Confirm FENCE-001" button so you can verify it immediately.',
        },
        {
          name: '2. Four Guardrail Metric Cards (Active Fences, Pending Notes, Blocked Breaks, Expired Fences)',
          purpose:
            'Shows live health numbers: 6/10 Active Fences protecting code, 4 Pending Notes waiting for voice confirmation, 10/10 Dangerous AI Edits blocked, and how many old fixes are now safe to delete.',
        },
        {
          name: '3. Interactive Repository Flowchart & Voice Agent',
          purpose:
            'Lets you paste any GitHub repo URL (like Anjanikumarkarlapati/Whyline), generates a 5-step visual flowchart, and speaks a beginner-friendly explanation + real-life example in English, Telugu, or Hindi.',
        },
        {
          name: '4. Pending Voice Confirmations List & 90-Second Demo Flow',
          purpose:
            'On the left, lists unverified code workarounds you can click to inspect. On the right, provides 3 simple buttons (Act 1: Confirm Voice, Act 2: Test Block, Act 3: Cutover v2) to test the entire app lifecycle in 90 seconds.',
        },
        {
          name: '5. Guardrail Intercept Ledger Chart (Bottom Graph)',
          purpose:
            'Visualizes daily voice confirmations vs. blocked AI code breaks over 5 days, with a collapsible table for exact numbers.',
        },
      ],
    },
    te: {
      title: 'దశ 2: కోడ్‌బేస్ గార్డ్ & ఫెన్స్ బ్రీఫింగ్ డ్యాష్‌బోర్డ్ (/)',
      subtitle: 'కోడ్ రక్షణ వివరాలు, లైవ్ గణాంకాలు మరియు 90-సెకన్ల డెమో ఉండే ప్రధాన కంట్రోల్ సెంటర్',
      beginnerSummary:
        'ఇది మీ కారు డ్యాష్‌బోర్డ్ లాంటి ప్రధాన స్క్రీన్. మీ కోడ్‌లో ఎన్ని సున్నితమైన వర్క్‌అరౌండ్స్ (Fences) ఉన్నాయి, వేటికి ఇంకా వాయిస్ వివరణ కావాలి, మరియు ఎన్ని ప్రమాదకరమైన AI మార్పులు ఆపబడ్డాయో ఒకే చూపులో చూపిస్తుంది.',
      realWorldExample:
        'ఉదాహరణ: ఆసుపత్రిలో నర్స్ స్టేషన్ బోర్డు లాంటిది—6 కేసులు పూర్తిగా సురక్షితంగా ఉన్నాయి, 4 కేసులకు డాక్టర్ వాయిస్ నోట్ కావాలి, 10 తప్పుడు మందుల ఆర్డర్లు ఆటోమేటిక్‌గా ఆపబడ్డాయి అని చూపించే బోర్డు.',
      sections: [
        {
          name: '1. అత్యవసర అలర్ట్ బ్యానర్ (Priority Workaround Alert)',
          purpose:
            'అత్యంత ముఖ్యమైన పేమెంట్ రీట్రై సమస్యను (PR #212) పైన చూపిస్తుంది, ఒకే క్లిక్‌తో వాయిస్ నోట్ ద్వారా ధృవీకరించడానికి ఉపయోగపడుతుంది.',
        },
        {
          name: '2. నాలుగు మెట్రిక్ కార్డులు (Active, Pending, Blocked, Expired)',
          purpose:
            'యాక్టివ్ ఫెన్స్‌లు (6/10), పెండింగ్ నోట్స్ (4), ఆపబడిన AI తప్పులు (10/10) మరియు తొలగించడానికి సురక్షితమైన పాత ఫెన్స్‌ల సంఖ్యను చూపిస్తాయి.',
        },
        {
          name: '3. ఇంటరాక్టివ్ రిపోజిటరీ ఫ్లోచార్ట్ & వాయిస్ ఏజెంట్',
          purpose:
            'ఏదైనా GitHub రిపోజిటరీని స్కాన్ చేసి 5 దశల ఫ్లోచార్ట్‌ను చూపిస్తూ సులభమైన ఉదాహరణతో తెలుగు, హిందీ లేదా ఇంగ్లీష్‌లో వివరించి వినిపిస్తుంది.',
        },
        {
          name: '4. పెండింగ్ వాయిస్ లిస్ట్ & 90-సెకన్ల డెమో బటన్లు',
          purpose:
            'కేవలం 3 బటన్లతో (Act 1, Act 2, Act 3) వాయిస్ కన్ఫర్మేషన్, AI ఎడిట్ బ్లాక్ మరియు v2 అప్‌గ్రేడ్ ఎలా పనిచేస్తాయో పరీక్షించడానికి వాడతాము.',
        },
      ],
    },
    hi: {
      title: 'चरण 2: कोडबेस गार्ड और फ़ेंस ब्रीफ़िंग डैशबोर्ड (/)',
      subtitle: 'आपका मुख्य कंट्रोल सेंटर जो सुरक्षित कोड नियम, लाइव आँकड़े और 90-सेकंड का डेमो दिखाता है',
      beginnerSummary:
        'यह आपकी कार के मुख्य डैशबोर्ड जैसा है। एक ही नज़र में यह बताता है कि कोड में कितने ज़रूरी जुगाड़ (Fences) हैं, किन पर अभी वॉइस नोट रिकॉर्ड करना बाकी है, और कितनी खतरनाक AI गलतियों को रोका गया है।',
      realWorldExample:
        'उदाहरण: अस्पताल के नर्स स्टेशन बोर्ड की तरह जहाँ लिखा होता है—6 मरीज़ों की फ़ाइल पूरी है, 4 पर डॉक्टर का वॉइस नोट बाकी है, और 10 गलत दवाइयों के ऑर्डर समय पर रोक दिए गए।',
      sections: [
        {
          name: '1. प्राथमिकता अलर्ट बैनर (Priority Workaround Alert)',
          purpose:
            'सबसे ज़रूरी पेमेंट रीट्राई नियम (PR #212) को सबसे ऊपर दिखाता है ताकि आप एक क्लिक में उसकी पुष्टि कर सकें।',
        },
        {
          name: '2. चार सुरक्षा मेट्रिक कार्ड (Active, Pending, Blocked, Expired)',
          purpose:
            'सक्रिय फ़ेंस (6/10), लंबित वॉइस नोट्स (4), रोके गए गलत बदलाव (10/10) और हटाने योग्य पुराने फ़ेंस की संख्या दिखाते हैं।',
        },
        {
          name: '3. इंटरैक्टिव रिपॉज़िटरी फ़्लोचार्ट और वॉइस एजेंट',
          purpose:
            'किसी भी GitHub रिपो को स्कैन करके 5-चरणों का फ़्लोचार्ट बनाता है और आसान शब्दों व उदाहरण के साथ हिंदी, तेलुगु या अंग्रेजी में समझाता है।',
        },
        {
          name: '4. लंबित वॉइस सूची और 90-सेकंड डेमो फ़्लो',
          purpose:
            '3 आसान बटनों (Act 1, Act 2, Act 3) से पूरे सिस्टम को 90 सेकंड में लाइव टेस्ट करने के लिए उपयोग किया जाता है।',
        },
      ],
    },
  },
  {
    stepNumber: '03',
    id: 'fences',
    route: '/fences',
    image: '/screenshots/03-spoken-fences.png',
    en: {
      title: 'Step 3: Spoken Fences Studio (/fences)',
      subtitle: 'Record voice notes, transcribe Indic speech, and lock them onto specific AST code nodes',
      beginnerSummary:
        'What is a "Spoken Fence"? When a developer writes a weird-looking code fix (like retrying 5 times or pausing 120ms), future developers or AI bots might think it is a mistake and delete it. On this page, you record a 10-second voice note explaining WHY that code must stay, and WhyLine turns your voice into an automatic unit test shield!',
      realWorldExample:
        'Real-Life Example: Imagine putting a voice-recorded sticky note on a weird plumbing valve in your house that says: "Do NOT close this valve! It keeps the upstairs heater from freezing at night." If a plumber tries to turn it off, an alarm plays your voice note.',
      sections: [
        {
          name: '1. AST Node Selector & Filter Bar (Left Sidebar)',
          purpose:
            'Lists all 10 suspicious code spots found by the Tree-sitter AST scanner (like GatewayRouter.java or DicomShaderPipeline.java). You can search or filter by Verified, Pending, or Unverified.',
        },
        {
          name: '2. Voice Recorder & Multilingual Speech-to-Text Panel',
          purpose:
            'Lets you speak into your microphone (or use a sample recording) in Telugu, Hindi, or English. Gnani Vachana transcribes your voice and extracts key technical words (like retryCount = 5, Razorpay, packet drop).',
        },
        {
          name: '3. AST Target Node & Guarded Code Preview',
          purpose:
            'Shows the exact file, line numbers, SHA-256 structural hash, and the exact line of code being protected so your voice note is permanently tied to that code structure.',
        },
        {
          name: '4. Auto-Compiled JUnit / Pytest Invariant Test Shield',
          purpose:
            'Automatically converts your spoken explanation into a real unit test (JUnit for Java or Pytest for Python) and a YAML configuration expiry rule.',
        },
      ],
    },
    te: {
      title: 'దశ 3: స్పోకెన్ ఫెన్సెస్ స్టూడియో (/fences)',
      subtitle: 'వాయిస్ నోట్స్ రికార్డ్ చేసి, వాటిని అక్షరాలలోకి మార్చి, నిర్దిష్ట కోడ్ భాగాలకు (AST Nodes) లాక్ చేసే పేజీ',
      beginnerSummary:
        '"స్పోకెన్ ఫెన్స్" అంటే ఏమిటి? కోడ్‌లో ఏదైనా వింతగా కనిపించే ఫిక్స్ రాసినప్పుడు, తర్వాత వచ్చే AI బాట్ దాన్ని తప్పు అనుకుని డిలీట్ చేయవచ్చు. ఈ పేజీలో మీరు 10 సెకన్ల వాయిస్ నోట్ ద్వారా "ఈ కోడ్ ఎందుకు ఉందో" చెబితే, సిస్టమ్ దాన్ని ఆటోమేటిక్ సెక్యూరిటీ కవచంగా (Unit Test) మారుస్తుంది!',
      realWorldExample:
        'ఉదాహరణ: ఇంట్లో ఒక ముఖ్యమైన వాటర్ వాల్వ్ మీద వాయిస్ రికార్డింగ్ ఉన్న లేబుల్ పెట్టి "రాత్రిపూట హీటర్ ఆగిపోకుండా ఇది తెరిచే ఉంచాలి, ఆపకండి!" అని చెప్పడం లాంటిది.',
      sections: [
        {
          name: '1. AST నోడ్ జాబితా & ఫిల్టర్ బార్ (ఎడమవైపు జాబితా)',
          purpose:
            'కోడ్‌లో గుర్తించిన 10 సున్నితమైన భాగాలను (FENCE-001 నుండి FENCE-010 వరకు) చూపిస్తుంది.',
        },
        {
          name: '2. వాయిస్ రికార్డర్ & ట్రాన్స్‌క్రిప్షన్ ప్యానెల్',
          purpose:
            'తెలుగు, హిందీ లేదా ఇంగ్లీష్‌లో మాట్లాడితే దాన్ని టెక్స్ట్‌గా మార్చి ముఖ్యమైన టెక్నికల్ పదాలను గుర్తిస్తుంది.',
        },
        {
          name: '3. AST కోడ్ ప్రివ్యూ & SHA-256 హ్యాష్',
          purpose:
            'ఏ ఫైల్‌లో, ఏ లైన్ నంబర్‌లో ఆ కోడ్ ఉందో స్పష్టంగా చూపిస్తూ మీ వాయిస్‌ను ఆ కోడ్‌కు జత చేస్తుంది.',
        },
        {
          name: '4. ఆటోమేటిక్ JUnit / Pytest టెస్ట్ కంపైలర్',
          purpose:
            'మీరు మాట్లాడిన కారణాన్ని ఆటోమేటిక్‌గా ఒక టెస్ట్ ప్రోగ్రామ్‌గా మార్చి కోడ్‌ను రక్షిస్తుంది.',
        },
      ],
    },
    hi: {
      title: 'चरण 3: स्पोकन फ़ेंसेस स्टूडियो (/fences)',
      subtitle: 'ऑडियो नोट्स रिकॉर्ड करें, उन्हें टेक्स्ट में बदलें और सीधे कोड नोड्स (AST) से जोड़ें',
      beginnerSummary:
        '"स्पोकन फ़ेंस" क्या है? जब कोई डेवलपर किसी समस्या को रोकने के लिए कोड में कोई विशेष नियम (जैसे 5 बार रीट्राई) लिखता है, तो बाद में कोई AI उसे गलती समझकर हटा सकता है। इस पेज पर आप 10 सेकंड में बोलकर बताते हैं कि वह कोड क्यों ज़रूरी है, और सिस्टम आपकी आवाज़ को एक ऑटोमैटिक सुरक्षा कवच (Unit Test) में बदल देता है!',
      realWorldExample:
        'उदाहरण: जैसे घर के किसी मुख्य पानी के वाल्व पर एक बोलने वाला टैग लगा देना कि "इस वाल्व को बंद मत करना, वरना ऊपर की टंकी खाली हो जाएगी!"',
      sections: [
        {
          name: '1. AST नोड सूची और फ़िल्टर बार (बायाँ पैनल)',
          purpose:
            'स्कैनर द्वारा खोजे गए सभी 10 संवेदनशील कोड स्थानों (FENCE-001 से FENCE-010) की सूची दिखाता है।',
        },
        {
          name: '2. वॉइस रिकॉर्डर और स्पीच-टू-टेक्स्ट पैनल',
          purpose:
            'हिंदी, तेलुगु या अंग्रेजी में आपकी आवाज़ रिकॉर्ड करके उसे सटीक टेक्स्ट और तकनीकी शब्दों में बदलता है।',
        },
        {
          name: '3. कोड प्रीव्यू और SHA-256 संरचना हैश',
          purpose:
            'दिखाता है कि आपकी वॉइस किस फ़ाइल और किस कोड लाइन की सुरक्षा कर रही है।',
        },
        {
          name: '4. ऑटो-कम्पाइल्ड JUnit / Pytest सुरक्षा कवच',
          purpose:
            'आपकी बोली गई बात को अपने-आप एक यूनिट टेस्ट में बदल देता है ताकि कोई उसे तोड़ न सके।',
        },
      ],
    },
  },
  {
    stepNumber: '04',
    id: 'studio',
    route: '/studio',
    image: '/screenshots/04-code-studio.png',
    en: {
      title: 'Step 4: AST Anomaly & Fence Code Studio (/studio)',
      subtitle: 'Inspect actual source code files, test pre-commit AI edit interception, and upgrade config',
      beginnerSummary:
        'This page is your interactive code editor and crash-test simulator. Here you can look directly at the Java or Python code, pretend to be a careless AI bot that tries to delete a protected line, and watch WhyLine instantly block the bad edit before it can break production!',
      realWorldExample:
        'Real-Life Example: Think of automatic lane-keep assist in a modern car. If you accidentally steer off the road without a turn signal, the steering wheel gently stops you and warns you why that lane boundary is there.',
      sections: [
        {
          name: '1. Fence File Selector Tabs (Top Bar of Editor)',
          purpose:
            'Lets you switch between all 10 guarded code files (GatewayRouter.java, DicomShaderPipeline.java, JwtClockSkewFilter.java, gst_rounding_engine.py, etc.).',
        },
        {
          name: '2. Code Editor with Highlighted Guardrail Lines',
          purpose:
            'Displays the exact source code with line numbers and highlights the protected workaround line (such as int retryCount = 5; or Thread.sleep(120);).',
        },
        {
          name: '3. Pre-Commit MCP Guard Simulator ("Simulate Naive Agent Edit")',
          purpose:
            'When you click this button, it simulates an AI coding assistant changing retryCount = 5 to retryCount = 1, and shows the exact REJECT_EDIT block message from the FastMCP guardrail.',
        },
        {
          name: '4. Spoken ADR Context & Config Expiry Panel (Right Column)',
          purpose:
            'Shows the human story behind the code, plays the original developer\'s voice note, and lets you test upgrading application.yml from v1 to v2 so the fence expires safely.',
        },
      ],
    },
    te: {
      title: 'దశ 4: AST అనామలీ & ఫెన్స్ కోడ్ స్టూడియో (/studio)',
      subtitle: 'అసలు సోర్స్ కోడ్‌ను పరిశీలించడం మరియు AI చేసే తప్పుడు మార్పులను లైవ్‌లో అడ్డుకోవడం',
      beginnerSummary:
        'ఇది మీ ఇంటరాక్టివ్ కోడ్ ఎడిటర్ మరియు క్రాష్-టెస్ట్ సిమ్యులేటర్. ఇక్కడ మీరు అసలు Java లేదా Python కోడ్‌ను చూడవచ్చు, మరియు ఒక AI బాట్ ఆ కోడ్‌ను మార్చడానికి ప్రయత్నిస్తే WhyLine దాన్ని ఎలా అడ్డుకుంటుందో (REJECT_EDIT) స్వయంగా పరీక్షించవచ్చు!',
      realWorldExample:
        'ఉదాహరణ: ఆధునిక కారులో ఉండే "లేన్-కీప్ అసిస్ట్" (Lane-Keep Assist) లాంటిది—డ్రైవర్ పొరపాటున రోడ్డు పక్కకు వెళ్తుంటే వెంటనే అలారం మోగించి స్టీరింగ్‌ను సరిచేస్తుంది.',
      sections: [
        {
          name: '1. ఫైల్ సెలెక్టర్ ట్యాబ్‌లు',
          purpose:
            '10 రక్షిత కోడ్ ఫైళ్ల మధ్య సులభంగా మారడానికి ఉపయోగపడతాయి.',
        },
        {
          name: '2. హైలైట్ చేయబడిన కోడ్ ఎడిటర్',
          purpose:
            'కోడ్‌లో ఏ లైన్ రక్షించబడుతుందో (ఉదాహరణకు retryCount = 5) స్పష్టంగా హైలైట్ చేసి చూపిస్తుంది.',
        },
        {
          name: '3. ప్రీ-కమిట్ MCP గార్డ్ సిమ్యులేటర్',
          purpose:
            'AI బాట్ కోడ్‌ను తప్పుగా మార్చినప్పుడు సిస్టమ్ దాన్ని ఎలా తిరస్కరిస్తుందో (REJECT_EDIT) వెంటనే చూపిస్తుంది.',
        },
        {
          name: '4. వాయిస్ ADR & కాన్ఫిగరేషన్ అప్‌గ్రేడ్ ప్యానెల్',
          purpose:
            'ఆ కోడ్ వెనుక ఉన్న వాయిస్ నోట్‌ను వినిపిస్తుంది మరియు v2 అప్‌గ్రేడ్ ద్వారా పాత ఫెన్స్‌ను సురక్షితంగా రిటైర్ చేయనిస్తుంది.',
        },
      ],
    },
    hi: {
      title: 'चरण 4: AST एनोमली और फ़ेंस कोड स्टूडियो (/studio)',
      subtitle: 'असली सोर्स कोड देखें और AI द्वारा किए जाने वाले गलत बदलावों को लाइव रोकें',
      beginnerSummary:
        'यह आपका इंटरैक्टिव कोड एडिटर और सुरक्षा टेस्टिंग सिम्युलेटर है। यहाँ आप असली Java या Python कोड देख सकते हैं और टेस्ट कर सकते हैं कि जब कोई AI एजेंट किसी सुरक्षित लाइन को हटाने की कोशिश करता है, तो WhyLine उसे तुरंत कैसे रोकता है (REJECT_EDIT)!',
      realWorldExample:
        'उदाहरण: आधुनिक कार के "लेन-कीप असिस्ट" की तरह—अगर ड्राइवर गलती से लेन से बाहर जाने लगे, तो कार तुरंत चेतावनी देती है और दुर्घटना होने से बचाती है।',
      sections: [
        {
          name: '1. फ़ाइल चयन टैब्स',
          purpose:
            'सभी 10 सुरक्षित कोड फ़ाइलों के बीच स्विच करने के लिए उपयोग किया जाता है।',
        },
        {
          name: '2. हाइलाइट किया गया कोड एडिटर',
          purpose:
            'दिखाता है कि कोड की कौन-सी लाइन (जैसे retryCount = 5) सुरक्षा कवच के अंदर है।',
        },
        {
          name: '3. प्री-कमिट MCP गार्ड सिम्युलेटर',
          purpose:
            'दिखाता है कि जब कोई AI बिना अनुमति के कोड बदलता है तो सिस्टम उसे कैसे ब्लॉक (REJECT_EDIT) करता है।',
        },
        {
          name: '4. स्पोकन ADR और कॉन्फ़िग अपग्रेड पैनल',
          purpose:
            'डेवलपर का मूल वॉइस नोट सुनाता है और v1 से v2 अपग्रेड का परीक्षण करने देता है।',
        },
      ],
    },
  },
  {
    stepNumber: '05',
    id: 'incidents',
    route: '/incidents',
    image: '/screenshots/05-incidents-memory.png',
    en: {
      title: 'Step 5: Incidents & Institutional Memory Ledger (/incidents)',
      subtitle: 'Every past production outage linked to the exact code workaround and voice note that solved it',
      beginnerSummary:
        'Why do weird code workarounds exist in the first place? Because of a real crisis in the past! This page is the "Medical History Book" of your software. It links every past emergency (like Incident INC-9921 or Pull Request #212) to the exact developer voice recording and the automated test that prevents that emergency from ever happening again.',
      realWorldExample:
        'Real-Life Example: Like a hospital patient\'s permanent allergy chart. It records: "On Jan 12 (Incident #9921), patient had a severe reaction to Drug X. Doctor recorded a voice note, and the pharmacy computer now blocks Drug X automatically."',
      sections: [
        {
          name: '1. Search & Status Filter Controls (Top Bar)',
          purpose:
            'Lets you search across all 10 production incidents by PR number (#212, #184), incident ID (INC-9921), file name, or filter by Verified / Pending / Unverified status.',
        },
        {
          name: '2. Incident Provenance Table (Left / Main Ledger)',
          purpose:
            'Shows each incident side-by-side with its Fence ID, the method it protects, the Git PR/Incident ticket, and a 1-click button to play the engineer\'s 16kHz WAV voice note.',
        },
        {
          name: '3. Deep-Dive Incident Drawer / Inspector Card',
          purpose:
            'When you click any incident row, it reveals the full bilingual voice transcript, the exact git blame author, the auto-generated JUnit/Pytest assertion, and the expiry rule.',
        },
      ],
    },
    te: {
      title: 'దశ 5: ఇన్సిడెంట్స్ & ఇన్‌స్టిట్యూషనల్ మెమరీ లెడ్జర్ (/incidents)',
      subtitle: 'గతంలో జరిగిన ప్రతి సాఫ్ట్‌వేర్ సమస్య (Outage), దానికి సంబంధించిన వాయిస్ నోట్ మరియు కోడ్ రక్షణ చరిత్ర',
      beginnerSummary:
        'అసలు కోడ్‌లో ఇలాంటి ప్రత్యేక ఫిక్స్‌లు ఎందుకు పెడతారు? ఎందుకంటే గతంలో ఒక పెద్ద సమస్య వచ్చి ఉంటుంది! ఈ పేజీ మీ సాఫ్ట్‌వేర్ యొక్క "మెడికల్ హిస్టరీ బుక్" లాంటిది. గతంలో జరిగిన ప్రతి సమస్యను (INC-9921, PR #212) దాని వాయిస్ రికార్డింగ్ మరియు టెస్ట్‌తో కలిపి చూపిస్తుంది.',
      realWorldExample:
        'ఉదాహరణ: పేషెంట్ శాశ్వత అలెర్జీ రికార్డు లాంటిది—"జనవరి 12న ఫలానా మందు వల్ల రియాక్షన్ వచ్చింది, కాబట్టి డాక్టర్ వాయిస్ నోట్ పెట్టారు, ఇకపై ఫార్మసీ కంప్యూటర్ ఆ మందును ఆటోమేటిక్‌గా ఆపేస్తుంది."',
      sections: [
        {
          name: '1. సెర్చ్ & స్టేటస్ ఫిల్టర్ బార్',
          purpose:
            'PR నంబర్ (#212), ఇన్సిడెంట్ ఐడి (INC-9921) లేదా ఫైల్ పేరుతో వెతకడానికి ఉపయోగపడుతుంది.',
        },
        {
          name: '2. ఇన్సిడెంట్ హిస్టరీ టేబుల్',
          purpose:
            'ప్రతి పాత సమస్యను, దాన్ని పరిష్కరించిన కోడ్ ఫెన్స్‌ను మరియు 16kHz వాయిస్ ఆడియో ప్లే బటన్‌ను ఒకే చోట చూపిస్తుంది.',
        },
        {
          name: '3. పూర్తి వివరణ కార్డ్ (Incident Inspector)',
          purpose:
            'ఏదైనా వరుసపై క్లిక్ చేయగానే పూర్తి వాయిస్ ట్రాన్స్‌క్రిప్ట్ మరియు ఆటోమేటిక్ టెస్ట్ కోడ్‌ను చూపిస్తుంది.',
        },
      ],
    },
    hi: {
      title: 'चरण 5: इंसिडेंट्स और इंस्टीट्यूशनल मेमोरी लेजर (/incidents)',
      subtitle: 'अतीत की हर प्रोडक्शन समस्या, उसका वॉइस नोट और उसे रोकने वाले कोड नियम का पूरा इतिहास',
      beginnerSummary:
        'कोड में ऐसे अजीब नियम आखिर लिखे ही क्यों जाते हैं? क्योंकि अतीत में कोई बड़ी तकनीकी समस्या आई थी! यह पेज आपके सॉफ्टवेयर की "मेडिकल हिस्ट्री बुक" है। यह हर पुरानी घटना (जैसे INC-9921 या PR #212) को इंजीनियर की आवाज़ और सुरक्षा टेस्ट से जोड़कर दिखाता है।',
      realWorldExample:
        'उदाहरण: किसी मरीज़ के स्थायी एलर्जी चार्ट की तरह—"12 जनवरी को इस दवा से रिएक्शन हुआ था, डॉक्टर ने वॉइस नोट लिखा और अब कंप्यूटर भविष्य में वह दवा देने से अपने-आप रोकता है।"',
      sections: [
        {
          name: '1. खोज और स्थिति फ़िल्टर बार',
          purpose:
            'PR नंबर (#212), इंसिडेंट आईडी (INC-9921) या फ़ाइल नाम से किसी भी पुरानी घटना को खोजने के लिए।',
        },
        {
          name: '2. इंसिडेंट इतिहास तालिका (Provenance Table)',
          purpose:
            'प्रत्येक घटना, उसके फ़ेंस आईडी, कोड मेथड और 16kHz WAV वॉइस प्ले बटन को एक साथ दिखाती है।',
        },
        {
          name: '3. विस्तृत इंसिडेंट इंस्पेक्टर कार्ड',
          purpose:
            'किसी भी पंक्ति पर क्लिक करने पर पूरा ट्रांसक्रिप्ट, गिट इतिहास और सुरक्षा टेस्ट दिखाता है।',
        },
      ],
    },
  },
  {
    stepNumber: '06',
    id: 'copilot',
    route: '/copilot',
    image: '/screenshots/06-voice-copilot.png',
    en: {
      title: 'Step 6: Ask the Repo — Voice Co-Pilot Page (/copilot)',
      subtitle: 'Powered by Server-Side Gemini Reasoning to explain complex code in simple terms with real-life examples',
      beginnerSummary:
        'Have a question about why a piece of code is written a certain way, or how to fix a bug without breaking an existing rule? Instead of reading raw Java/Python code aloud, this page uses the server-side Gemini API with reasoning to explain the code like a friendly teacher—using simple everyday language, a real-life analogy, step-by-step logic, and 3 safe coding strategies in English, Telugu, or Hindi!',
      realWorldExample:
        'Real-Life Example: Instead of a mechanic handing you a 500-page engine blueprint in technical jargon, the mechanic says: "Your radiator fan stays on for 2 minutes after parking so the engine doesn\'t overheat—think of a runner walking slowly to cool down after a sprint."',
      sections: [
        {
          name: '1. Voice & Text Question Bar + Preset Question Pills',
          purpose:
            'Lets you ask any question about the codebase by typing, clicking the Microphone button, or clicking 1-click preset pills (GatewayRouter double-charge, DICOM 120ms sleep, JWT 180s clock skew, GST 0.00001 rounding, or Whyline Architecture).',
        },
        {
          name: '2. Spoken & Written Answer Card (Top Result Box)',
          purpose:
            'Speaks a natural, conversational summary aloud in English (en-IN), Telugu (te-IN), or Hindi (hi-IN) and lets you replay the 16kHz WAV audio.',
        },
        {
          name: '3. "In Simple Terms (Gemini Reasoning)" & "Real-Life Example / Analogy" Cards',
          purpose:
            'Breaks down the codebase logic in plain beginner terms (no raw code reading!) paired with a relatable everyday analogy (like mailing 5 copies of a bank payment slip with the same Order #101 stamp).',
        },
        {
          name: '4. Step-by-Step Reasoning Trace',
          purpose:
            'Lists the 1-2-3 logical chain (Root Problem -> Existing Workaround -> Safe Solution) so beginners can follow the exact cause and effect.',
        },
        {
          name: '5. Recommended Code Patch & 3 Ranked Architectural Strategies',
          purpose:
            'Provides copy-ready code that solves the problem safely plus 3 ranked options (Strategy 01: Low Risk, Strategy 02: Moderate Risk, Strategy 03: Config Upgrade).',
        },
      ],
    },
    te: {
      title: 'దశ 6: ఆస్క్ ది రిపో — వాయిస్ కో-పైలట్ పేజీ (/copilot)',
      subtitle: 'జెమిని రీజనింగ్ (Gemini Reasoning) ఉపయోగించి కష్టమైన కోడ్‌ను సులభమైన మాటల్లో, నిజ-జీవిత ఉదాహరణలతో వివరించే పేజీ',
      beginnerSummary:
        'కోడ్‌లో ఉన్న లాజిక్ అర్థం కాకపోయినా లేదా పాత రూల్స్ దెబ్బతినకుండా బగ్ ఎలా ఫిక్స్ చేయాలో తెలుసుకోవాలన్నా ఈ పేజీని వాడతాము. ఇది కోడ్‌ను ఉన్నది ఉన్నట్లు చదవకుండా, జెమిని రీజనింగ్ సహాయంతో ఒక మంచి టీచర్ లాగా సులభమైన మాటల్లో, రోజువారీ జీవిత ఉదాహరణతో తెలుగు, హిందీ మరియు ఇంగ్లీష్‌లో వివరిస్తుంది!',
      realWorldExample:
        'ఉదాహరణ: కారు మెకానిక్ మీకు పెద్ద ఇంజనీరింగ్ పుస్తకం ఇవ్వకుండా, "కారు ఆపిన తర్వాత కూడా ఇంజిన్ చల్లబడటానికి ఫ్యాన్ 2 నిమిషాలు తిరుగుతుంది—పరిగెత్తిన తర్వాత మనిషి నెమ్మదిగా నడుస్తూ ఊపిరి తీసుకున్నట్లు" అని సులభంగా చెప్పడం లాంటిది.',
      sections: [
        {
          name: '1. వాయిస్ & టెక్స్ట్ ప్రశ్న బార్ + రెడీమేడ్ ప్రశ్న బటన్లు',
          purpose:
            'మైక్రోఫోన్ ద్వారా లేదా టైప్ చేయడం ద్వారా కోడ్ గురించి ఏ ప్రశ్నైనా అడగవచ్చు, లేదా పైన ఉన్న 5 రెడీమేడ్ బటన్లను క్లిక్ చేయవచ్చు.',
        },
        {
          name: '2. వాయిస్ & రాతపూర్వక సమాధానం (Spoken & Written Answer)',
          purpose:
            'సమాధానాన్ని సహజమైన తెలుగు, హిందీ లేదా ఇంగ్లీష్ గొంతుతో చదివి వినిపిస్తుంది.',
        },
        {
          name: '3. "సులభమైన మాటల్లో వివరణ" & "నిజ-జీవిత ఉదాహరణ" కార్డులు',
          purpose:
            'కోడ్‌ను బట్టీ పట్టకుండా, అసలు విషయం ఏమిటో సాధారణ భాషలో మరియు బ్యాంకు రసీదు, సినిమా ప్రొజెక్టర్, రైలు టికెట్ వంటి సులభమైన ఉదాహరణలతో వివరిస్తాయి.',
        },
        {
          name: '4. దశలవారీ ఆలోచనా క్రమం (Step-by-Step Reasoning)',
          purpose:
            '1-2-3 పాయింట్లలో అసలు సమస్య ఏమిటి, పాత కోడ్ ఏం చేస్తోంది, మరియు కొత్త పరిష్కారం ఎలా పనిచేస్తుందో చూపిస్తుంది.',
        },
        {
          name: '5. సురక్షిత కోడ్ ప్యాచ్ & 3 ఆర్కిటెక్చరల్ వ్యూహాలు',
          purpose:
            'కాపీ చేసుకోవడానికి సిద్ధంగా ఉన్న కోడ్ మరియు 3 సురక్షిత మార్గాలను (Strategies 1, 2, 3) అందిస్తుంది.',
        },
      ],
    },
    hi: {
      title: 'चरण 6: आस्क द रिपो — वॉइस को-पायलट पेज (/copilot)',
      subtitle: 'जेमिनी रीज़निंग (Gemini Reasoning) द्वारा कठिन कोड को सरल शब्दों और वास्तविक जीवन के उदाहरणों के साथ समझाने वाला पेज',
      beginnerSummary:
        'अगर आप जानना चाहते हैं कि कोई कोड कैसे काम करता है या बिना पुराने नियम तोड़े बग कैसे ठीक करें, तो यह पेज आपकी मदद करता है। यह केवल लिखा हुआ कोड पढ़ने के बजाय, सर्वर-साइड जेमिनी रीज़निंग का उपयोग करके एक अच्छे शिक्षक की तरह सरल भाषा और रोज़मर्रा के उदाहरण के साथ हिंदी, तेलुगु और अंग्रेजी में समझाता है!',
      realWorldExample:
        'उदाहरण: जैसे कोई मैकेनिक आपको जटिल इंजीनियरिंग चार्ट दिखाने के बजाय आसान भाषा में कहे—"गाड़ी बंद करने के बाद भी इंजन को ठंडा रखने के लिए पंखा 2 मिनट तक चलता है, ठीक वैसे ही जैसे तेज़ दौड़ने के बाद इंसान थोड़ा पैदल चलकर साँस सामान्य करता है।"',
      sections: [
        {
          name: '1. वॉइस और टेक्स्ट प्रश्न बार + प्रीसेट प्रश्न बटन',
          purpose:
            'माइक्रोफ़ोन से बोलकर या टाइप करके कोई भी प्रश्न पूछने या 1-क्लिक प्रीसेट प्रश्नों को चुनने के लिए।',
        },
        {
          name: '2. बोलकर और लिखकर उत्तर कार्ड (Spoken & Written Answer)',
          purpose:
            'हिंदी, तेलुगु या अंग्रेजी में बातचीत के अंदाज़ में जवाब सुनाता है।',
        },
        {
          name: '3. "सरल शब्दों में (जेमिनी रीज़निंग)" और "वास्तविक जीवन का उदाहरण" कार्ड',
          purpose:
            'कठिन कोड को आम बोलचाल की भाषा में और बैंक रसीद, सिनेमा प्रोजेक्टर या ट्रेन टिकट जैसे आसान उदाहरणों के साथ समझाते हैं।',
        },
        {
          name: '4. चरण-दर-चरण तर्क (Step-by-Step Reasoning)',
          purpose:
            '1-2-3 बिंदुओं में समस्या की जड़, मौजूदा नियम और सुरक्षित समाधान को क्रम से समझाता है।',
        },
        {
          name: '5. सुरक्षित कोड पैच और 3 आर्किटेक्चरल रणनीतियाँ',
          purpose:
            'कॉपी करने योग्य सुरक्षित कोड और 3 विकल्प (Strategy 01, 02, 03) दिखाता है।',
        },
      ],
    },
  },
  {
    stepNumber: '07',
    id: 'git',
    route: '/git',
    image: '/screenshots/07-git-flowchart.png',
    en: {
      title: 'Step 7: Git Commit Graph & Spoken Architecture Flowchart (/git)',
      subtitle: 'Visual SVG node diagram and step-by-step spoken walkthrough of any Git repository',
      beginnerSummary:
        'When a beginner joins a software project, looking at hundreds of folders and files is overwhelming. This page turns any Git repository into a clean 5-step visual map (like a metro train map!). You can click Step 1 through Step 5 to see how data flows through the project and listen to the voice agent explain each stage with a simple real-world example.',
      realWorldExample:
        'Real-Life Example: Like an interactive metro station map that lights up Station 1 -> Station 2 -> Station 3 and announces over the speaker what happens at each stop in your chosen language.',
      sections: [
        {
          name: '1. Repository URL / Path Input & Language Controls',
          purpose:
            'Lets you scan any GitHub repository (such as Anjanikumarkarlapati/Whyline or HealthConnect), pick the branch, and choose English, Telugu, or Hindi voice narration.',
        },
        {
          name: '2. Interactive SVG Architecture Flowchart Canvas',
          purpose:
            'Draws the 5 core stages of the codebase as connected boxes with animated directional arrows. Clicking any box selects that stage immediately.',
        },
        {
          name: '3. Selected Stage Detail Card (Simple Explanation + Real-Life Example + Code)',
          purpose:
            'Shows the selected step\'s conversational voice script, "In Simple Terms (Gemini Reasoning)", "Real-Life Example / Analogy" (like an airport X-ray scanner or railway crossing barrier), and the guarded code snippet.',
        },
      ],
    },
    te: {
      title: 'దశ 7: గిట్ కమిట్ గ్రాఫ్ & ఆర్కిటెక్చర్ ఫ్లోచార్ట్ (/git)',
      subtitle: 'ఏదైనా Git రిపోజిటరీని 5 దశల బొమ్మగా (SVG Flowchart) చూపించి ఒక్కో దశను వాయిస్‌తో వివరించే పేజీ',
      beginnerSummary:
        'కొత్తగా ప్రాజెక్ట్‌లోకి వచ్చిన వారికి వందల ఫైళ్లు చూస్తే గందరగోళంగా ఉంటుంది. ఈ పేజీ మొత్తం ప్రాజెక్ట్‌ను ఒక మెట్రో రైలు మ్యాప్ లాగా 5 సులభమైన దశలుగా (Step 1 నుండి Step 5 వరకు) బొమ్మ రూపంలో చూపిస్తుంది. ఏ బాక్స్ మీద క్లిక్ చేసినా ఆ భాగం ఏం చేస్తుందో సులభమైన ఉదాహరణతో తెలుగు, హిందీ లేదా ఇంగ్లీష్‌లో చెబుతుంది.',
      realWorldExample:
        'ఉదాహరణ: మెట్రో స్టేషన్‌లో ఉండే ఎలక్ట్రానిక్ రూట్ మ్యాప్ లాంటిది—స్టేషన్ 1 నుండి స్టేషన్ 5 వరకు లైట్లు వెలుగుతూ ప్రతి స్టేషన్‌లో ఏం జరుగుతుందో మైక్‌లో అనౌన్స్ చేయడం లాంటిది.',
      sections: [
        {
          name: '1. రిపోజిటరీ URL బార్ & భాష బటన్లు',
          purpose:
            'GitHub రిపోజిటరీని ఎంచుకోవడానికి మరియు వాయిస్ భాషను (ఇంగ్లీష్, తెలుగు, హిందీ) మార్చడానికి ఉపయోగపడుతుంది.',
        },
        {
          name: '2. ఇంటరాక్టివ్ SVG ఫ్లోచార్ట్ డయాగ్రమ్',
          purpose:
            '5 కోడ్ భాగాలను బాక్సులు మరియు బాణాలతో కలుపుతూ చూపిస్తుంది. ఏ బాక్స్ మీదనైనా క్లిక్ చేసి వివరాలు చూడవచ్చు.',
        },
        {
          name: '3. ఎంచుకున్న దశ యొక్క పూర్తి వివరణ కార్డ్',
          purpose:
            'ఎంచుకున్న దశను సులభమైన మాటల్లో (Gemini Reasoning), నిజ-జీవిత ఉదాహరణతో (ఎయిర్‌పోర్ట్ X-రే స్కానర్ లేదా రైల్వే గేట్ లాగా) మరియు కోడ్‌తో సహా చూపిస్తుంది.',
        },
      ],
    },
    hi: {
      title: 'चरण 7: गिट कमिट ग्राफ़ और आर्किटेक्चर फ़्लोचार्ट (/git)',
      subtitle: 'किसी भी Git रिपॉज़िटरी का विज़ुअल SVG नक्शा और चरण-दर-चरण बोलकर समझाने वाला पेज',
      beginnerSummary:
        'जब कोई नया व्यक्ति किसी बड़े प्रोजेक्ट को देखता है, तो सैकड़ों फ़ाइलें देखकर उलझन होती है। यह पेज पूरे प्रोजेक्ट को मेट्रो ट्रेन के नक्शे की तरह 5 आसान चरणों (Step 1 से Step 5) के चित्र में बदल देता है। आप किसी भी बॉक्स पर क्लिक करके सुन सकते हैं कि वह हिस्सा क्या काम करता है।',
      realWorldExample:
        'उदाहरण: मेट्रो स्टेशन के डिजिटल रूट मैप की तरह जो स्टेशन 1 से 5 तक की लाइट जलाता है और आपकी भाषा में बताता है कि हर स्टेशन पर क्या होता है।',
      sections: [
        {
          name: '1. रिपॉज़िटरी URL इनपुट और भाषा नियंत्रण',
          purpose:
            'किसी भी GitHub रिपो को स्कैन करने और हिंदी, तेलुगु या अंग्रेजी वॉइस चुनने के लिए।',
        },
        {
          name: '2. इंटरैक्टिव SVG आर्किटेक्चर फ़्लोचार्ट कैनवास',
          purpose:
            'प्रोजेक्ट के 5 मुख्य चरणों को तीरों से जुड़े बॉक्स के रूप में दिखाता है जिन पर क्लिक किया जा सकता है।',
        },
        {
          name: '3. चयनित चरण विवरण कार्ड (सरल व्याख्या + उदाहरण + कोड)',
          purpose:
            'चुने गए चरण को सरल शब्दों (Gemini Reasoning), रोज़मर्रा के उदाहरण (जैसे एयरपोर्ट एक्स-रे मशीन या रेलवे फाटक) और कोड के साथ दिखाता है।',
        },
      ],
    },
  },
  {
    stepNumber: '08',
    id: 'settings',
    route: '/settings',
    image: '/screenshots/08-settings-page.png',
    en: {
      title: 'Step 8: Studio, Security & Model Settings (/settings)',
      subtitle: 'Configure repositories, voice engines, and inspect the 6/6 security audit verification table',
      beginnerSummary:
        'Think of this page as the "Control Room & Safety Inspection Certificate" of WhyLine Studio. It shows which repository and voice model are connected, verifies that all 6 security rules (like blocking hacker path attacks or unsafe URLs) are active, and summarizes the 10 benchmark safety tests.',
      realWorldExample:
        'Real-Life Example: Like the health & fire-safety inspection certificate framed on the wall of a restaurant kitchen, showing every safety lock is green and verified.',
      sections: [
        {
          name: '1. Three Configuration Cards (01 Repo & Env, 02 Git Pre-Commit & MCP, 03 Speech & Vector Models)',
          purpose:
            'Displays active file paths, localStorage language persistence, Git pre-commit hook status, Gnani Vachana STT/TTS voice engine, and Tree-sitter AST scanner status.',
        },
        {
          name: '2. Security & Test Suite Audit Remediation Table (6 / 6 Enforced)',
          purpose:
            'Shows all 6 audited security guardrails (CORS allowlist, Git branch sanitization, Workspace path containment, Audio allowlist, MCP diff hunk check, and AST signature hash) verified active.',
        },
        {
          name: '3. HealthConnect Invariant Telemetry Scorecard (Bottom Summary)',
          purpose:
            'Displays the 10/10 protected benchmark score: 10 seeded AST anomalies, 7 hard-blocked edits, 3 historical cautions, and 0 false positives.',
        },
      ],
    },
    te: {
      title: 'దశ 8: స్టూడియో, సెక్యూరిటీ & మోడల్ సెట్టింగ్స్ (/settings)',
      subtitle: 'రిపోజిటరీ సెట్టింగ్స్, వాయిస్ మోడల్స్ మరియు 6/6 సెక్యూరిటీ ఆడిట్ సర్టిఫికేట్ ఉండే పేజీ',
      beginnerSummary:
        'ఈ పేజీని WhyLine Studio యొక్క "కంట్రోల్ రూమ్ & భద్రతా తనిఖీ సర్టిఫికేట్" లాగా భావించండి. ఏ రిపోజిటరీ కనెక్ట్ అయి ఉంది, ఏ వాయిస్ మోడల్ పనిచేస్తోంది మరియు అన్ని 6 సెక్యూరిటీ నియమాలు (6/6 Enforced) ఆన్‌లో ఉన్నాయో లేదో ఇది చూపిస్తుంది.',
      realWorldExample:
        'ఉదాహరణ: ఒక పెద్ద భవనం లేదా రెస్టారెంట్‌లో గోడపై ఉండే "ఫైర్ & సేఫ్టీ ఇన్‌స్పెక్షన్ సర్టిఫికేట్" లాంటిది—అన్ని భద్రతా వ్యవస్థలు సరిగ్గా పనిచేస్తున్నాయని ఇది నిర్ధారిస్తుంది.',
      sections: [
        {
          name: '1. మూడు కాన్ఫిగరేషన్ కార్డులు (01 Repo, 02 MCP Guard, 03 Speech & AST)',
          purpose:
            'యాక్టివ్ రిపోజిటరీ పాత్, ఎంచుకున్న భాష (localStorage), ప్రీ-కమిట్ హుక్ మరియు జ్ఞాని వచన వాయిస్ ఇంజిన్ వివరాలను చూపిస్తాయి.',
        },
        {
          name: '2. సెక్యూరిటీ ఆడిట్ టేబుల్ (6 / 6 Enforced)',
          purpose:
            'VULN-01 నుండి DEFECT-3.4 వరకు అన్ని 6 భద్రతా కవచాలు యాక్టివ్‌గా ఉన్నాయని చూపించే టేబుల్.',
        },
        {
          name: '3. హెల్త్‌కనెక్ట్ టెలిమెట్రీ స్కోర్‌కార్డ్ (10 / 10 Protected)',
          purpose:
            'మొత్తం 10 సున్నితమైన కోడ్ భాగాలు 100% రక్షణలో ఉన్నాయని, ఫాల్స్ పాజిటివ్స్ 0 అని చూపిస్తుంది.',
        },
      ],
    },
    hi: {
      title: 'चरण 8: स्टूडियो, सुरक्षा और मॉडल सेटिंग्स (/settings)',
      subtitle: 'रिपॉज़िटरी पथ, वॉइस इंजन और 6/6 सुरक्षा ऑडिट सत्यापन तालिका देखने का पेज',
      beginnerSummary:
        'इस पेज को WhyLine Studio के "कंट्रोल रूम और सुरक्षा प्रमाणपत्र" की तरह समझें। यह दिखाता है कि कौन-सा रिपॉज़िटरी और वॉइस मॉडल जुड़ा है, और प्रमाणित करता है कि सभी 6 सुरक्षा नियम (6/6 Enforced) पूरी तरह सक्रिय हैं।',
      realWorldExample:
        'उदाहरण: किसी इमारत या अस्पताल में लगे "फायर और सेफ्टी इंस्पेक्शन सर्टिफिकेट" की तरह, जो बताता है कि सभी सुरक्षा ताले जाँचे जा चुके हैं और चालू हैं।',
      sections: [
        {
          name: '1. तीन कॉन्फ़िगरेशन कार्ड (01 रिपो, 02 गिट गार्ड, 03 स्पीच और स्कैनर)',
          purpose:
            'सक्रिय रिपॉज़िटरी पथ, भाषा स्टोरेज, प्री-कमिट हुक और ज्ञानी वचना वॉइस इंजन की स्थिति दिखाते हैं।',
        },
        {
          name: '2. सुरक्षा और टेस्ट ऑडिट तालिका (6 / 6 Enforced)',
          purpose:
            'दिखाती है कि सभी 6 सुरक्षा नियम (CORS, Git सैनिटाइजेशन, पाथ सुरक्षा आदि) पूरी तरह लागू हैं।',
        },
        {
          name: '3. हेल्थकनेक्ट टेलीमेट्री स्कोरकार्ड (10 / 10 Protected)',
          purpose:
            'दिखाता है कि सभी 10 संवेदनशील कोड नियम सुरक्षित हैं और गलत अलार्म (False Positives) शून्य हैं।',
        },
      ],
    },
  },
  {
    stepNumber: '09',
    id: 'ask-drawer',
    route: '/',
    image: '/screenshots/09-ask-repo-drawer.png',
    en: {
      title: 'Step 9: Quick "Ask Repo" Slide-Over Drawer (Available on Any Page)',
      subtitle: 'Instant slide-out Gemini Reasoning assistant accessible from the top navigation bar anywhere in the app',
      beginnerSummary:
        'What if you are inspecting a fence on the Dashboard or in the Code Studio and want a quick simple explanation without leaving your current page? Clicking the "Ask Repo" button in the top-right corner slides out this handy side panel so you can get a simple-terms explanation + real-life example on the spot!',
      realWorldExample:
        'Real-Life Example: Like pressing the "Call Attendant" button at your airplane seat—a helper comes right to your seat to answer your question without you having to get up and walk to the front cabin.',
      sections: [
        {
          name: '1. Top-Right "Ask Repo" Trigger Button',
          purpose:
            'Located in the top navigation bar on every page so help is always 1 click away.',
        },
        {
          name: '2. Slide-Over Question Box & Language Preset Chips',
          purpose:
            'Lets you ask a question or click Telugu / Hindi / Fix Double-Charge preset chips right inside the drawer.',
        },
        {
          name: '3. Instant Simple Terms + Real-Life Example + Copyable Patch',
          purpose:
            'Displays the same Gemini-reasoned simple explanation, real-world analogy, spoken audio playback, and 3 ranked strategies without losing your place on the background page.',
        },
      ],
    },
    te: {
      title: 'దశ 9: క్విక్ "Ask Repo" స్లైడ్-ఓవర్ డ్రాయర్ (ఏ పేజీ నుండైనా తెరవవచ్చు)',
      subtitle: 'మీరు ఉన్న పేజీని వదలకుండానే పైన ఉన్న "Ask Repo" బటన్‌తో వెంటనే తెరుచుకునే సహాయక ప్యానెల్',
      beginnerSummary:
        'మీరు డ్యాష్‌బోర్డ్ లేదా కోడ్ స్టూడియో చూస్తున్నప్పుడు ఆ పేజీ నుండి బయటకు వెళ్లకుండానే ఏదైనా కోడ్ గురించి అడగాలనుకుంటే, పైన కుడివైపు ఉన్న "Ask Repo" బటన్ నొక్కండి. వెంటనే పక్కనుండి ఈ ప్యానెల్ తెరుచుకుని సులభమైన మాటల్లో మరియు ఉదాహరణతో సమాధానం చెబుతుంది!',
      realWorldExample:
        'ఉదాహరణ: విమానంలో మీ సీటు దగ్గర ఉండే "Call Attendant" బటన్ నొక్కితే మీరు సీటులోంచి లేవకుండానే సహాయకులు మీ దగ్గరకు వచ్చి సందేహం తీర్చడం లాంటిది.',
      sections: [
        {
          name: '1. టాప్-రైట్ "Ask Repo" బటన్',
          purpose:
            'ప్రతి పేజీలో పైన కనిపిస్తుంది, ఒక్క క్లిక్‌తో డ్రాయర్‌ను తెరుస్తుంది.',
        },
        {
          name: '2. తక్షణ ప్రశ్న బాక్స్ & భాషా బటన్లు',
          purpose:
            'తెలుగు, హిందీ లేదా డబుల్-ఛార్జ్ ఫిక్స్ గురించిన ప్రశ్నలను వెంటనే అడగడానికి ఉపయోగపడుతుంది.',
        },
        {
          name: '3. సులభమైన వివరణ + ఉదాహరణ + కోడ్ ప్యాచ్',
          purpose:
            'మీరు చూస్తున్న పేజీ మారకుండానే జెమిని రీజనింగ్ ద్వారా సులభమైన వివరణ మరియు కోడ్ పరిష్కారాన్ని చూపిస్తుంది.',
        },
      ],
    },
    hi: {
      title: 'चरण 9: त्वरित "Ask Repo" स्लाइड-ओवर ड्रॉअर (हर पेज पर उपलब्ध)',
      subtitle: 'बिना पेज बदले ऊपर दिए गए "Ask Repo" बटन से तुरंत खुलने वाला सहायक पैनल',
      beginnerSummary:
        'जब आप डैशबोर्ड या कोड स्टूडियो पर काम कर रहे हों और बिना पेज छोड़े किसी कोड का सरल मतलब समझना चाहें, तो ऊपर दाईं ओर "Ask Repo" बटन दबाएँ। यह साइड पैनल तुरंत खुलकर सरल शब्दों और उदाहरण के साथ जवाब देता है!',
      realWorldExample:
        'उदाहरण: जैसे हवाई जहाज़ में अपनी सीट से ही "कॉल अटेंडेंट" बटन दबाना—आपको अपनी सीट से उठकर कहीं जाने की ज़रूरत नहीं पड़ती, मदद सीधे आपके पास आ जाती है।',
      sections: [
        {
          name: '1. टॉप-राइट "Ask Repo" बटन',
          purpose:
            'हर पेज के ऊपरी बार में मौजूद रहता है ताकि एक क्लिक में मदद मिल सके।',
        },
        {
          name: '2. त्वरित प्रश्न बॉक्स और प्रीसेट बटन',
          purpose:
            'ड्रॉअर के अंदर ही तेलुगु, हिंदी या डबल-चार्ज फ़िक्स के प्रश्न पूछने की सुविधा देता है।',
        },
        {
          name: '3. सरल व्याख्या + वास्तविक उदाहरण + कोड पैच',
          purpose:
            'बिना मुख्य स्क्रीन छोड़े जेमिनी रीज़निंग की सरल व्याख्या, उदाहरण और 3 सुरक्षित रणनीतियाँ दिखाता है।',
        },
      ],
    },
  },
];

export default function VisualGuideReportPage() {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [selectedStep, setSelectedStep] = useState('ALL');

  const localeKey = lang === 'te' ? 'te' : lang === 'hi' ? 'hi' : 'en';

  const headerCopy = {
    en: {
      meta: 'Beginner Step-by-Step Visual Documentation • 9 Pages & Interfaces',
      title: 'Complete Page-by-Page Visual Report & Beginner Guide',
      subtitle:
        'Ordered step-by-step walkthrough of every screen in WhyLine Studio—with real screenshots, section-by-section explanations of what each part is used for, and simple everyday examples.',
      allStepsBtn: 'Show All 9 Steps in Order',
      whatIsThisTitle: 'What Is This Page? (Explained for Complete Beginners)',
      realLifeExampleTitle: 'Simple Everyday Example / Analogy',
      sectionsBreakdownTitle: 'Section-by-Section Guide: What Every Part in the Image Is Used For',
      openLiveBtn: 'Open This Page Live',
      stepBadgePrefix: 'Step',
    },
    te: {
      meta: 'కొత్తవారి కోసం దశలవారీ విజువల్ గైడ్ • 9 పేజీల పూర్తి వివరణ',
      title: 'ప్రతి పేజీ యొక్క చిత్రం, విభాగాల వివరణ & సులభమైన ఉదాహరణల నివేదిక',
      subtitle:
        'WhyLine Studio లోని ప్రతి పేజీని క్రమ పద్ధతిలో (Step 1 నుండి Step 9 వరకు) చిత్రాలతో సహా, ఏ భాగం దేనికి ఉపయోగపడుతుందో మరియు సులభమైన రోజువారీ ఉదాహరణలతో ఇక్కడ చూడవచ్చు.',
      allStepsBtn: 'అన్ని 9 దశలను వరుసగా చూపించు',
      whatIsThisTitle: 'ఈ పేజీ దేనికోసం? (కొత్తవారికి సులభమైన మాటల్లో)',
      realLifeExampleTitle: 'నిజ-జీవిత ఉదాహరణ / పోలిక',
      sectionsBreakdownTitle: 'చిత్రంలోని ప్రతి విభాగం వివరణ: దేనిని దేనికోసం వాడతాము?',
      openLiveBtn: 'ఈ పేజీని లైవ్‌లో తెరవండి',
      stepBadgePrefix: 'దశ',
    },
    hi: {
      meta: 'शुरुआती लोगों के लिए चरण-दर-चरण विज़ुअल गाइड • 9 पेज रिपोर्ट',
      title: 'प्रत्येक पेज की चित्र सहित विस्तृत रिपोर्ट और आसान शुरुआती गाइड',
      subtitle:
        'WhyLine Studio के हर पेज को क्रम से (Step 1 से Step 9 तक) असली स्क्रीनशॉट, हर सेक्शन का उपयोग और रोज़मर्रा के आसान उदाहरणों के साथ यहाँ समझें।',
      allStepsBtn: 'सभी 9 चरण क्रम से दिखाएँ',
      whatIsThisTitle: 'यह पेज क्या है? (शुरुआती लोगों के लिए सरल शब्दों में)',
      realLifeExampleTitle: 'वास्तविक जीवन का आसान उदाहरण',
      sectionsBreakdownTitle: 'चित्र के प्रत्येक भाग का विवरण: हमने किस भाग का उपयोग किसलिए किया है?',
      openLiveBtn: 'इस पेज को लाइव खोलें',
      stepBadgePrefix: 'चरण',
    },
  }[localeKey];

  const visiblePages =
    selectedStep === 'ALL'
      ? GUIDE_PAGES
      : GUIDE_PAGES.filter((p) => p.stepNumber === selectedStep);

  return (
    <div className="page-stack">
      <section className="context-header">
        <div>
          <p className="context-meta">{headerCopy.meta}</p>
          <h1 className="page-title">{headerCopy.title}</h1>
          <p className="page-subtitle">{headerCopy.subtitle}</p>
        </div>
      </section>

      {/* Step Filter Bar */}
      <section className="card" style={{ padding: '16px 20px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            className={`btn ${selectedStep === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedStep('ALL')}
          >
            <BookOpen size={16} weight="bold" />
            <span>{headerCopy.allStepsBtn}</span>
          </button>
          {GUIDE_PAGES.map((page) => {
            const content = page[localeKey];
            return (
              <button
                key={page.stepNumber}
                type="button"
                className={`btn ${selectedStep === page.stepNumber ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedStep(page.stepNumber)}
                style={{ fontSize: '13px', padding: '6px 12px' }}
              >
                <span>
                  {headerCopy.stepBadgePrefix} {page.stepNumber}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Ordered Step-by-Step Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {visiblePages.map((page) => {
          const content = page[localeKey];
          return (
            <article
              key={page.id}
              className="card"
              style={{
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
              }}
            >
              {/* Card Header */}
              <div
                className="card-header"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '16px',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '6px',
                    }}
                  >
                    <span className="badge badge-verified">
                      {headerCopy.stepBadgePrefix} {page.stepNumber} / 09
                    </span>
                    <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Route: {page.route}
                    </span>
                  </div>
                  <h2 className="section-header" style={{ fontSize: '20px', marginBottom: '4px' }}>
                    {content.title}
                  </h2>
                  <p className="text-muted" style={{ fontSize: '14px' }}>
                    {content.subtitle}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate(page.route)}
                >
                  <span>{headerCopy.openLiveBtn}</span>
                  <ArrowRight size={15} weight="bold" />
                </button>
              </div>

              {/* Screenshot Image Showcase */}
              <div
                style={{
                  marginTop: '18px',
                  marginBottom: '20px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-canvas)',
                }}
              >
                <img
                  src={page.image}
                  alt={content.title}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              </div>

              {/* Beginner Explanation + Real-Life Example */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    background: 'var(--bg-subtle)',
                    borderLeft: '4px solid var(--accent-primary)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 700,
                      fontSize: '14px',
                      marginBottom: '8px',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <Sparkle size={18} weight="fill" />
                    <span>{headerCopy.whatIsThisTitle}</span>
                  </div>
                  <p style={{ fontSize: '14px', lineHeight: 1.65 }}>{content.beginnerSummary}</p>
                </div>

                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    background: 'var(--bg-subtle)',
                    borderLeft: '4px solid var(--status-verified-text)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 700,
                      fontSize: '14px',
                      marginBottom: '8px',
                      color: 'var(--status-verified-text)',
                    }}
                  >
                    <Lightbulb size={18} weight="fill" />
                    <span>{headerCopy.realLifeExampleTitle}</span>
                  </div>
                  <p style={{ fontSize: '14px', lineHeight: 1.65 }}>{content.realWorldExample}</p>
                </div>
              </div>

              {/* Section-by-Section Breakdown */}
              <div>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Compass size={18} weight="bold" />
                  <span>{headerCopy.sectionsBreakdownTitle}</span>
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {content.sections.map((sec, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '13.5px',
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle
                          size={16}
                          weight="fill"
                          style={{ color: 'var(--accent-primary)', flexShrink: 0 }}
                        />
                        <span>{sec.name}</span>
                      </div>
                      <p className="text-muted" style={{ fontSize: '13px', lineHeight: 1.55 }}>
                        {sec.purpose}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
