import { toBcp47 } from './fenceLogic.js';

/**
 * Builds the Gemini system instruction and user prompt so Gemini reasons over the codebase
 * and explains it in simple, everyday terms with a concrete real-world example/analogy
 * in the requested language (en-IN, te-IN, or hi-IN) instead of reading raw code verbatim.
 */
export function buildGeminiCodebasePrompt({
  question = '',
  repoSlug = 'Anjanikumarkarlapati/Whyline',
  fenceId = 'FENCE-001',
  language = 'en-IN',
  codeContext = '',
}) {
  const bcp47 = toBcp47(language);
  const langName =
    bcp47 === 'te-IN'
      ? 'Telugu (తెలుగు script)'
      : bcp47 === 'hi-IN'
        ? 'Hindi (हिंदी Devanagari script)'
        : 'English';

  const systemInstruction = `You are the WhyLine Codebase Reasoning Mentor.
CRITICAL RULES:
1. NEVER just read the raw code or repeat technical docstrings verbatim.
2. First REASON deeply about WHY the code/workaround exists, what hidden production problem it solves, and what would happen in real life if someone deleted it.
3. Explain the answer in SIMPLE, EVERYDAY TERMS that a junior developer or non-specialist can understand immediately.
4. ALWAYS include a vivid REAL-WORLD EXAMPLE / ANALOGY (like a bank teller, post office stamp, train station clock, airport X-ray scanner, or hospital printer) to make the concept effortless to grasp.
5. Write ALL text fields (spoken_reply, simple_explanation, real_world_example, reasoning_steps, and strategies) natively in ${langName} (${bcp47}). Keep code identifiers like GatewayRouter.java, retryCount, or ast_scanner.py in backticks only when needed, but make spoken_reply natural and conversational for Text-to-Speech.`;

  const prompt = `User Question / Topic: ${question || 'Explain this codebase and its guarded workarounds in simple terms with a real-world example.'}
Target Repository: ${repoSlug}
Active Fence / Module: ${fenceId}
Target Language: ${langName} (${bcp47})
Codebase Context:
${codeContext || 'WhyLine Studio & HealthConnect: FENCE-001 (GatewayRouter.java retryCount=5 for midnight packet drops, PR #212), FENCE-002 (DicomShaderPipeline.java Thread.sleep(120) for Adreno 619 GPU DMA sync, PR #219), FENCE-003 (JwtClockSkewFilter.java 180s clock skew for rural satellite clinics, PR #149), FENCE-008 (gst_rounding_engine.py 0.00001 epsilon bias for AP Treasury tax audits), and WhyLine core modules (ast_scanner.py, provenance_miner.py, gnani_speech.py, fence_compiler.py, mcp_server.py).'}`;

  return { bcp47, langName, systemInstruction, prompt };
}

/**
 * Detects which codebase topic / module / fence the user is asking about.
 */
export function detectCodebaseTopic(question = '', fenceId = '') {
  const q = `${question} ${fenceId}`.toLowerCase();
  if (
    q.includes('sleep') ||
    q.includes('120') ||
    q.includes('dicom') ||
    q.includes('adreno') ||
    q.includes('gpu') ||
    q.includes('fence-002')
  ) {
    return 'adreno_sleep';
  }
  if (
    q.includes('clock') ||
    q.includes('skew') ||
    q.includes('180') ||
    q.includes('jwt') ||
    q.includes('satellite') ||
    q.includes('fence-003')
  ) {
    return 'clock_skew';
  }
  if (
    q.includes('gst') ||
    q.includes('epsilon') ||
    q.includes('rounding') ||
    q.includes('treasury') ||
    q.includes('fence-008')
  ) {
    return 'gst_rounding';
  }
  if (
    q.includes('whyline') ||
    q.includes('ast_scanner') ||
    q.includes('provenance') ||
    q.includes('mcp_server') ||
    q.includes('how does this repo') ||
    q.includes('architecture')
  ) {
    return 'whyline_architecture';
  }
  return 'double_charge_retry';
}

/**
 * Generates reasoned, simple-terms explanations with everyday real-world examples
 * across English (en-IN), Telugu (te-IN), and Hindi (hi-IN).
 * Used to enrich codebase queries and provide deterministic fallback when offline.
 */
export function buildReasonedCodebaseExplanation({
  question = '',
  fenceId = 'FENCE-001',
  language = 'en-IN',
  repoSlug = 'Anjanikumarkarlapati/Whyline',
}) {
  const bcp47 = toBcp47(language);
  const isTe = bcp47 === 'te-IN';
  const isHi = bcp47 === 'hi-IN';
  const topic = detectCodebaseTopic(question, fenceId);

  const catalog = {
    double_charge_retry: {
      en: {
        simple_explanation:
          'Instead of reading the raw Java loop: at midnight, the bank server gets overloaded and ignores 1 out of every 4 payment messages. So our code tries up to 5 times (`retryCount = 5`) to make sure the hospital payment goes through. To stop the customer from being charged twice when we retry, we attach a unique "receipt stamp" (`X-Idempotency-Key`) to the payment.',
        real_world_example:
          'Real-Life Example: Imagine sending a payment slip to a busy bank counter at midnight where the clerk accidentally drops every 4th envelope. You send the slip up to 5 times so one definitely reaches the clerk—but you write "Order #101 - Pay Only Once" on top of every copy. Even if the clerk opens two copies, the bank sees the same Order #101 stamp and charges your account only once!',
        reasoning_steps: [
          '1. Why the code retries 5 times: The legacy v1 payment gateway drops network packets during the 00:00–00:15 midnight rush.',
          '2. Why we cannot just delete retryCount = 5: Deleting the retries would cause 18% of midnight hospital payments to fail completely.',
          '3. How to fix double-charging simply: Keep the 5 retries, but attach a unique Order Stamp (X-Idempotency-Key) so duplicate retries are recognized as the same payment.',
        ],
        spoken_reply:
          'Let me explain this in simple terms instead of just reading the code. At midnight, the old payment server gets crowded and drops messages, so our code tries sending the payment up to 5 times. Think of it like mailing a bill to a busy post office: you send 5 copies so one definitely arrives, and you write the same Receipt Number on every copy so the bank only charges the patient once!',
      },
      te: {
        simple_explanation:
          'కోడ్‌ను యథాతథంగా చదవకుండా సరళంగా చెప్పుకుందాం: అర్ధరాత్రి సమయంలో బ్యాంక్ సర్వర్ రద్దీగా ఉండి ప్రతి 4 పేమెంట్ మెసేజ్‌లలో ఒకదానిని మిస్ చేస్తుంది. అందుకే పేమెంట్ కచ్చితంగా పూర్తయ్యేలా మన కోడ్ 5 సార్లు ప్రయత్నిస్తుంది (`retryCount = 5`). అయితే 5 సార్లు పంపినప్పుడు కస్టమర్ అకౌంట్ నుండి రెండుసార్లు డబ్బు కట్ కాకుండా ఉండటానికి, ప్రతి ప్రయత్నానికి ఒకే "రసీదు నంబర్" (`X-Idempotency-Key`) జతచేస్తాము.',
        real_world_example:
          'నిజ జీవిత ఉదాహరణ: మీరు అర్ధరాత్రి రద్దీగా ఉండే బ్యాంక్ కౌంటర్‌కు పేమెంట్ స్లిప్ పంపుతున్నారనుకోండి. అక్కడి క్లర్క్ పొరపాటున కొన్ని కవర్లను పడేస్తుంటాడు. అందుకే మీరు 5 కాపీలు పంపుతారు, కానీ ప్రతి కాపీ పైన "ఆర్డర్ #101 - ఒక్కసారే డబ్బు కట్ చేయండి" అని రాస్తారు. అప్పుడు క్లర్క్ రెండు కవర్లు తెరిచినా, ఒకే ఆర్డర్ నంబర్ చూసి ఒక్కసారే డబ్బు కట్ చేస్తాడు!',
        reasoning_steps: [
          '1. 5 సార్లు ఎందుకు ప్రయత్నిస్తుంది: పాత v1 పేమెంట్ గేట్‌వే అర్ధరాత్రి రద్దీలో నెట్‌వర్క్ ప్యాకెట్లను డ్రాప్ చేస్తుంది.',
          '2. retryCount = 5 ఎందుకు తొలగించకూడదు: దీన్ని తీసేస్తే 18% ఆసుపత్రి పేమెంట్లు విఫలమవుతాయి.',
          '3. సులభమైన పరిష్కారం: 5 ప్రయత్నాలను అలాగే ఉంచి, ఒకే రసీదు స్టాంప్ (X-Idempotency-Key) జోడిస్తే డబుల్-ఛార్జ్ సమస్య పూర్తిగా ఆగిపోతుంది.',
        ],
        spoken_reply:
          'దీనిని కోడ్ లాగా కాకుండా సులభమైన ఉదాహరణతో అర్థం చేసుకుందాం. అర్ధరాత్రి బ్యాంక్ సర్వర్ రద్దీగా ఉన్నప్పుడు మెసేజ్‌లు మిస్ అవుతాయి, కాబట్టి మన కోడ్ 5 సార్లు ప్రయత్నిస్తుంది. ఇది రద్దీగా ఉన్న పోస్టాఫీసులో 5 కాపీలు పంపడం లాంటిది—కానీ ప్రతి కాపీపై ఒకే రసీదు నంబర్ రాయడం వల్ల బ్యాంక్ ఒక్కసారే డబ్బు కట్ చేస్తుంది!',
      },
      hi: {
        simple_explanation:
          'कोड को सीधे पढ़ने के बजाय आसान शब्दों में समझें: आधी रात को बैंक का सर्वर बहुत व्यस्त होता है और हर 4 में से 1 पेमेंट संदेश छूट जाता है। इसलिए हमारा कोड पेमेंट सफल करने के लिए 5 बार कोशिश करता है (`retryCount = 5`)। लेकिन बार-बार कोशिश करने पर ग्राहक के खाते से दो बार पैसे न कटें, इसलिए हम हर प्रयास पर एक ही "रसीद मुहर" (`X-Idempotency-Key`) लगा देते हैं।',
        real_world_example:
          'आसान उदाहरण: मान लीजिए आप आधी रात को एक भीड़भाड़ वाले बैंक काउंटर पर भुगतान पर्ची भेज रहे हैं जहाँ क्लर्क से हर चौथा लिफाफा गिर जाता है। आप 5 पर्चियाँ भेजते हैं ताकि एक ज़रूर पहुँचे—लेकिन हर पर्ची पर लिख देते हैं "ऑर्डर #101 - केवल एक बार पैसे काटें"। अब अगर क्लर्क को दो पर्चियाँ भी मिलें, तो वह एक ही नंबर देखकर सिर्फ एक बार पैसे काटेगा!',
        reasoning_steps: [
          '1. कोड 5 बार कोशिश क्यों करता है: पुराना v1 पेमेंट गेटवे आधी रात के ट्रैफ़िक में नेटवर्क पैकेट गिरा देता है।',
          '2. retryCount = 5 को हटाना क्यों ख़तरनाक है: इसे हटाने से 18% अस्पताल पेमेंट तुरंत फ़ेल हो जाएँगे।',
          '3. सबसे सरल समाधान: 5 प्रयासों को सुरक्षित रखें और साथ में एक यूनिक रसीद स्टैम्प (X-Idempotency-Key) जोड़ें ताकि डबल-चार्ज कभी न हो।',
        ],
        spoken_reply:
          'आइए इसे कोड पढ़ने के बजाय एक आसान उदाहरण से समझते हैं। आधी रात को बैंक सर्वर व्यस्त होने के कारण संदेश छूट जाते हैं, इसलिए हमारा कोड 5 बार कोशिश करता है। यह बिल्कुल वैसा है जैसे डाकघर में 5 पर्चियाँ भेजना, लेकिन हर पर्ची पर एक ही रसीद नंबर लिखना ताकि बैंक केवल एक ही बार पैसे काटे!',
      },
    },
    adreno_sleep: {
      en: {
        simple_explanation:
          'In simple terms: on clinic tablets, the graphics chip (Adreno GPU) says "I am finished drawing the X-ray!" slightly too early—about a tenth of a second before the image pixels actually finish copying into memory. That tiny 120-millisecond pause (`Thread.sleep(120)`) gives the tablet just enough time to finish copying the image cleanly.',
        real_world_example:
          'Real-Life Example: Think of an inkjet photo printer whose green "Ready" light blinks 1 second before the last strip of wet ink dries. If you grab the X-ray sheet the instant the light blinks, the picture smudges. Waiting just a fraction of a second (`120ms`) guarantees the doctor sees a crystal-clear scan!',
        reasoning_steps: [
          '1. Why the pause exists: The tablet GPU hardware signals completion 95ms before memory transfer actually finishes.',
          '2. What happens if removed: AI agents often delete Thread.sleep thinking it slows down code, which corrupts patient CT/MRI scans with black lines.',
          '3. Safe path forward: Keep the 120ms wait on Adreno 619 tablets, or check for Vulkan driver v4.2 before skipping it.',
        ],
        spoken_reply:
          'In simple words, the tablet graphics chip says it is done slightly before the X-ray picture finishes loading into memory. Think of a photo printer whose green light blinks a split-second before the ink dries—waiting 120 milliseconds prevents the doctor’s X-ray image from smudging!',
      },
      te: {
        simple_explanation:
          'సరళమైన మాటల్లో చెప్పాలంటే: క్లినిక్ టాబ్లెట్లలో గ్రాఫిక్స్ చిప్ (GPU) ఎక్స్-రే చిత్రం మెమరీలోకి పూర్తిగా లోడ్ అవ్వడానికి కొంచెం ముందే "పని పూర్తయింది!" అని సిగ్నల్ ఇస్తుంది. ఆ చిన్న 120 మిల్లీసెకన్ల విరామం (`Thread.sleep(120)`) బొమ్మ పూర్తిగా సిద్ధమయ్యే వరకు ఆగుతుంది.',
        real_world_example:
          'నిజ జీవిత ఉదాహరణ: ఫోటో ప్రింటర్‌లో ప్రింట్ బయటకు రాగానే ఇంక్ ఆరకముందే గ్రీన్ లైట్ వెలిగిందనుకోండి. వెంటనే చేత్తో లాగితే ఫోటో చెదిరిపోతుంది. ఒక్క క్షణం (120 మిల్లీసెకన్లు) ఆగితే డాక్టర్‌కు ఎక్స్-రే స్కాన్ చాలా స్పష్టంగా కనిపిస్తుంది!',
        reasoning_steps: [
          '1. ఈ విరామం ఎందుకు ఉంది: Adreno 619 GPU డ్రైవర్ బొమ్మ కాపీ అవ్వడానికి 95ms ముందే సిగ్నల్ ఇస్తుంది.',
          '2. తొలగిస్తే ఏమవుతుంది: AI ఏజెంట్లు దీన్ని అనవసరమైన ఆలస్యం అనుకుని తీసేస్తే, పేషెంట్ CT/MRI స్కాన్‌లలో నల్లని గీతలు వస్తాయి.',
          '3. సురక్షిత మార్గం: ఈ 120ms విరామాన్ని అలాగే ఉంచండి.',
        ],
        spoken_reply:
          'దీనిని సరళంగా చెప్పుకుంటే, ఫోటో ప్రింటర్‌లో ఇంక్ ఆరకముందే పేపర్ లాగితే బొమ్మ చెదిరిపోయినట్లు, టాబ్లెట్ మెమరీలో ఎక్స్-రే పూర్తిగా లోడ్ అవ్వడానికి ఈ 120 మిల్లీసెకన్ల విరామం సహాయపడుతుంది!',
      },
      hi: {
        simple_explanation:
          'आसान शब्दों में: क्लिनिक के टैबलेट में ग्राफ़िक्स चिप (GPU) एक्स-रे चित्र के मेमोरी में पूरी तरह कॉपी होने से थोड़ा पहले ही "काम पूरा हुआ!" का सिग्नल दे देती है। यह छोटा-सा 120 मिलीसेकंड का विराम (`Thread.sleep(120)`) चित्र को साफ़ और पूरा लोड होने का समय देता है।',
        real_world_example:
          'आसान उदाहरण: सोचिए एक फोटो प्रिंटर की हरी बत्ती स्याही सूखने से 1 सेकंड पहले ही जल जाती है। अगर आप तुरंत कागज़ खींच लेंगे तो एक्स-रे की तस्वीर धुंधली हो जाएगी। बस पल भर (120 मिलीसेकंड) रुकने से डॉक्टर को बिल्कुल साफ़ स्कैन दिखता है!',
        reasoning_steps: [
          '1. यह विराम क्यों है: टैबलेट का GPU मेमोरी ट्रांसफ़र पूरा होने से 95ms पहले ही सिग्नल दे देता है।',
          '2. हटाने पर क्या होगा: इसे हटाने से मरीज़ों के CT और MRI स्कैन पर काली पट्टियाँ आ जाती हैं।',
          '3. सुरक्षित उपाय: Adreno 619 टैबलेट पर इस 120ms विराम को सुरक्षित रखें।',
        ],
        spoken_reply:
          'आसान शब्दों में समझें तो जैसे फोटो प्रिंटर से निकली तस्वीर की स्याही सूखने के लिए हम पल भर रुकते हैं ताकि तस्वीर खराब न हो, वैसे ही यह 120 मिलीसेकंड का विराम डॉक्टर के टैबलेट पर एक्स-रे को साफ़ दिखाने के लिए ज़रूरी है!',
      },
    },
    clock_skew: {
      en: {
        simple_explanation:
          'In simple terms: 14 rural village clinics connect through satellite dishes that block automatic internet time updates, so their computer clocks slowly drift by 1 to 2 minutes. Setting `clockSkewSeconds = 180` gives those clinics a 3-minute grace window so their login tokens are not rejected.',
        real_world_example:
          'Real-Life Example: Imagine a school gatekeeper checking bus passes. A bus coming from a remote mountain village has a dashboard clock that runs 2 minutes slow. Giving a 3-minute grace period lets the village students enter smoothly instead of locking them outside the gate!',
        reasoning_steps: [
          '1. Why 180 seconds exists: Rural satellite terminals block UDP port 123 (NTP clock sync).',
          '2. Danger of tightening to 5 seconds: All 14 rural health centers would be locked out of emergency triage.',
          '3. Safe solution: Keep the 3-minute grace period for satellite clinic subnets.',
        ],
        spoken_reply:
          'Think of this like a train conductor giving a 3-minute grace period to passengers coming from a rural village whose station clock runs two minutes slow. Because satellite internet blocks automatic clock sync in 14 rural clinics, this 180-second buffer keeps doctors logged in during emergencies!',
      },
      te: {
        simple_explanation:
          'సరళంగా చెప్పాలంటే: 14 గ్రామీణ ఆసుపత్రులు శాటిలైట్ ఇంటర్నెట్ వాడుతున్నాయి. అందులో ఆటోమేటిక్ టైమ్ అప్‌డేట్ బ్లాక్ అవ్వడం వల్ల అక్కడి కంప్యూటర్ గడియారాలు 2 నిమిషాలు వెనుకబడతాయి. అందుకే `clockSkewSeconds = 180` ద్వారా 3 నిమిషాల గ్రేస్ టైమ్ ఇచ్చాము.',
        real_world_example:
          'నిజ జీవిత ఉదాహరణ: ఒక దూరపు పల్లెటూరి నుండి వచ్చే బస్సు గడియారం 2 నిమిషాలు ఆలస్యంగా నడుస్తోందనుకోండి. స్కూల్ గేట్ వద్ద 3 నిమిషాల వెసులుబాటు ఇస్తే ఆ విద్యార్థులను గేట్ బయట ఆపకుండా లోపలికి అనుమతించవచ్చు. అలాగే గ్రామీణ డాక్టర్ల లాగిన్ ఆగిపోకుండా ఈ 180 సెకన్ల టైమ్ సహాయపడుతుంది!',
        reasoning_steps: [
          '1. 180 సెకన్లు ఎందుకు: గ్రామీణ శాటిలైట్ నెట్‌వర్క్‌లో గడియారం సింక్ అయ్యే పోర్ట్ బ్లాక్ చేయబడింది.',
          '2. తగ్గిస్తే ఏమవుతుంది: 14 గ్రామీణ క్లినిక్‌లలో అత్యవసర వైద్య సేవలు లాక్ అయిపోతాయి.',
          '3. పరిష్కారం: శాటిలైట్ క్లినిక్‌ల కోసం 3 నిమిషాల గ్రేస్ విండోను అలాగే ఉంచాలి.',
        ],
        spoken_reply:
          'దీనిని ఒక చిన్న ఉదాహరణతో చూద్దాం: పల్లెటూరి గడియారం రెండు నిమిషాలు ఆలస్యంగా నడుస్తున్నప్పుడు, రైల్వే గేట్ వద్ద 3 నిమిషాల గ్రేస్ టైమ్ ఇచ్చినట్లుగా, ఈ 180 సెకన్ల సమయం గ్రామీణ ఆసుపత్రుల డాక్టర్లు ఇబ్బంది లేకుండా లాగిన్ అవ్వడానికి ఉపయోగపడుతుంది!',
      },
      hi: {
        simple_explanation:
          'आसान शब्दों में: 14 ग्रामीण अस्पताल सैटेलाइट इंटरनेट का उपयोग करते हैं जहाँ घड़ी को ऑटोमैटिक मिलाने वाला सिग्नल ब्लॉक रहता है, इसलिए उनके कंप्यूटर की घड़ी 2 मिनट पीछे हो जाती है। `clockSkewSeconds = 180` उन्हें 3 मिनट की छूट देता है ताकि उनका लॉगिन फेल न हो।',
        real_world_example:
          'आसान उदाहरण: मान लीजिए किसी दूरदराज़ के गाँव से आने वाली बस की घड़ी 2 मिनट पीछे चलती है। अगर स्कूल का गार्ड 3 मिनट की छूट दे दे, तो गाँव के बच्चों को गेट के बाहर नहीं रुकना पड़ेगा। ठीक वैसे ही यह 3 मिनट की छूट ग्रामीण डॉक्टरों का आपातकालीन लॉगिन चालू रखती है!',
        reasoning_steps: [
          '1. 180 सेकंड की छूट क्यों है: ग्रामीण सैटेलाइट टर्मिनल में घड़ी सिंक करने वाला पोर्ट 123 ब्लॉक रहता है।',
          '2. इसे कम करने का नुकसान: 14 ग्रामीण स्वास्थ्य केंद्र तुरंत लॉगआउट हो जाएँगे।',
          '3. सुरक्षित उपाय: ग्रामीण क्लिनिकों के लिए 180 सेकंड की छूट बनाए रखें।',
        ],
        spoken_reply:
          'आइए इसे आसान उदाहरण से समझें: जैसे किसी गाँव के स्टेशन की घड़ी 2 मिनट पीछे चलने पर ट्रेन कंडक्टर यात्रियों को 3 मिनट की छूट देता है, वैसे ही यह 180 सेकंड का समय 14 ग्रामीण अस्पतालों के डॉक्टरों को बिना रुकावट लॉगिन रखने में मदद करता है!',
      },
    },
    gst_rounding: {
      en: {
        simple_explanation:
          'In simple terms: standard Python math rounds exact half-paise to the nearest even number, while the State Treasury portal always rounds half-paise upward. Adding a microscopic `0.00001` nudge ensures our hospital bill matches the government tax portal down to the exact paisa.',
        real_world_example:
          'Real-Life Example: Imagine splitting a ₹10.05 restaurant bill where your calculator rounds `0.025` down to `2 paise`, but the government cashier always rounds `0.025` up to `3 paise`. That 1-paisa mismatch causes the government computer to reject the entire hospital subsidy claim! The tiny nudge makes both calculators agree every time.',
        reasoning_steps: [
          '1. Why the tiny 0.00001 number exists: Python uses banker rounding while the government portal uses upward rounding.',
          '2. Impact if deleted: A 1-paisa difference causes automatic rejection of hospital insurance reimbursements.',
          '3. Safe rule: Keep the epsilon nudge aligned with the State Treasury formula.',
        ],
        spoken_reply:
          'In simple words, our computer and the government tax portal round half-paise differently. Even a 1-paisa difference makes the government computer reject the hospital bill! Adding that tiny 0.00001 nudge is like calibrating two weighing scales in a shop so they always show the exact same weight.',
      },
      te: {
        simple_explanation:
          'సరళంగా చెప్పాలంటే: పైథాన్ సాధారణ లెక్కల్లో అర-పైసాను ఒకలా రౌండ్ చేస్తే, ప్రభుత్వ ట్రెజరీ పోర్టల్ మాత్రం ఎప్పుడూ పై అంకెకే రౌండ్ చేస్తుంది. ఈ చిన్న `0.00001` విలువ కలపడం వల్ల మన ఆసుపత్రి బిల్లు ప్రభుత్వ పోర్టల్ లెక్కతో పైసాతో సహా కచ్చితంగా సరిపోతుంది.',
        real_world_example:
          'నిజ జీవిత ఉదాహరణ: దుకాణంలో రెండు త్రాసులు (కాంటాలు) ఒక్క గ్రాము తేడా చూపించినా ఆడిట్‌లో బిల్లు తిరస్కరించబడుతుంది కదా! అలాగే ప్రభుత్వ పోర్టల్‌లో 1 పైసా తేడా వచ్చినా ఆసుపత్రి సబ్సిడీ బిల్లు ఆగిపోతుంది. ఈ చిన్న `0.00001` విలువ రెండు కాలిక్యులేటర్లు ఒకే జవాబు ఇచ్చేలా చేస్తుంది!',
        reasoning_steps: [
          '1. ఈ చిన్న సంఖ్య ఎందుకు ఉంది: ప్రభుత్వ పోర్టల్ మరియు పైథాన్ రౌండింగ్ విధానాలు వేరుగా ఉంటాయి.',
          '2. తీసేస్తే ఏమవుతుంది: 1 పైసా తేడా వచ్చినా ఆసుపత్రి సబ్సిడీ రీయింబర్స్‌మెంట్ తిరస్కరించబడుతుంది.',
          '3. పరిష్కారం: ట్రెజరీ నియమానికి అనుగుణంగా ఈ రౌండింగ్ బయాస్‌ను అలాగే ఉంచాలి.',
        ],
        spoken_reply:
          'సరళంగా చెప్పాలంటే, ప్రభుత్వ ట్యాక్స్ పోర్టల్‌లో ఒక్క పైసా తేడా వచ్చినా ఆసుపత్రి బిల్లు తిరస్కరించబడుతుంది. రెండు త్రాసులను ఒకే కొలతకు సెట్ చేసినట్లుగా, ఈ చిన్న 0.00001 విలువ మన బిల్లు మరియు ప్రభుత్వ లెక్క ఎప్పుడూ ఒకేలా ఉండేలా చేస్తుంది!',
      },
      hi: {
        simple_explanation:
          'आसान शब्दों में: पाइथन का सामान्य गणित आधे पैसे को अलग तरह से राउंड करता है, जबकि सरकारी ट्रेजरी पोर्टल हमेशा ऊपर की ओर राउंड करता है। यह सूक्ष्म `0.00001` जोड़ने से अस्पताल का बिल सरकारी पोर्टल से एक-एक पैसे तक बिल्कुल मेल खाता है।',
        real_world_example:
          'आसान उदाहरण: सोचिए अगर दुकान के दो तराजू में 1 ग्राम का भी अंतर हो तो ऑडिट पास नहीं होता। वैसे ही सरकारी पोर्टल पर 1 पैसे का अंतर होने पर भी अस्पताल की पूरी सब्सिडी रुक जाती है! यह छोटा-सा `0.00001` दोनों कैलकुलेटर का हिसाब बिल्कुल बराबर रखता है।',
        reasoning_steps: [
          '1. यह छोटी संख्या क्यों है: पाइथन और सरकारी पोर्टल के राउंडिंग नियम अलग हैं।',
          '2. हटाने पर नुकसान: मात्र 1 पैसे के अंतर से अस्पताल का सब्सिडी क्लेम रिजेक्ट हो जाता है।',
          '3. सुरक्षित नियम: सरकारी ऑडिट से मेल खाने के लिए इसे सुरक्षित रखें।',
        ],
        spoken_reply:
          'आसान शब्दों में समझें तो सरकारी टैक्स पोर्टल पर 1 पैसे का अंतर होने पर भी अस्पताल का बिल रिजेक्ट हो जाता है। जैसे दो तराजू को बिल्कुल बराबर मिलाया जाता है, वैसे ही यह छोटा-सा नंबर हमारे और सरकारी पोर्टल के हिसाब को हमेशा एक समान रखता है!',
      },
    },
    whyline_architecture: {
      en: {
        simple_explanation:
          `In simple terms: ${repoSlug} is a smart safety guardian for your codebase. It scans your code for unusual survival fixes (like retry loops or pauses), checks Git history to learn why a human wrote them, lets the engineer record a quick 10-second voice note in English, Telugu, or Hindi, and blocks AI coding bots from accidentally deleting those fixes!`,
        real_world_example:
          'Real-Life Example: Imagine renovating a hospital building. An automated robot bulldozer sees an odd-looking pillar and wants to knock it down to make the room look "cleaner." WhyLine is the senior architect who checks the building blueprint, plays the original engineer’s voice note saying "This pillar holds up the emergency room roof!", and stops the bulldozer in its tracks.',
        reasoning_steps: [
          '1. Spot unusual code (`ast_scanner.py`): Like an airport X-ray scanner, it looks at code structure rather than comments.',
          '2. Find the backstory (`provenance_miner.py` & `gnani_speech.py`): Links git blame history with a 10-second voice note in your own language.',
          '3. Guard the gate (`fence_compiler.py` & `mcp_server.py`): Turns the voice note into an automatic test and blocks unsafe AI edits before commit.',
        ],
        spoken_reply:
          'Let me explain how this codebase works using a simple real-life example. Imagine an automated robot renovating a hospital who wants to remove a strange-looking pillar just to make the room look neat. WhyLine acts like a smart building inspector: it checks the original blueprints, plays the engineer’s 10-second voice note explaining why that pillar holds up the roof, and blocks the robot from knocking it down!',
      },
      te: {
        simple_explanation:
          `సరళంగా చెప్పాలంటే: ${repoSlug} అనేది మీ కోడ్‌బేస్‌కు ఒక తెలివైన భద్రతా కవచం. ఇది కోడ్‌లోని ముఖ్యమైన వర్క్‌అరౌండ్‌లను గుర్తించి, అవి ఎందుకు రాశారో Git చరిత్ర ద్వారా తెలుసుకుని, ఇంజనీర్ యొక్క 10-సెకన్ల తెలుగు/హిందీ/ఇంగ్లీష్ వాయిస్ నోట్‌ను జతచేస్తుంది. ఆపై AI బాట్‌లు పొరపాటున ఆ ముఖ్యమైన కోడ్‌ను తొలగించకుండా అడ్డుకుంటుంది!`,
        real_world_example:
          'నిజ జీవిత ఉదాహరణ: ఒక ఆసుపత్రి భవనాన్ని ఆటోమేటిక్ రోబోతో రిపేర్ చేస్తున్నారనుకోండి. ఆ రోబో గది మధ్యలో ఉన్న ఒక స్తంభాన్ని చూసి "ఇది అడ్డుగా ఉంది, తీసేద్దాం" అనుకుంటుంది. అప్పుడు WhyLine ఒక సీనియర్ ఇంజనీర్ లాగా బ్లూప్రింట్ తనిఖీ చేసి, "ఈ స్తంభం పైకప్పును మోస్తోంది, తీయకండి!" అనే వాయిస్ నోట్‌ను వినిపించి రోబోను తక్షణమే ఆపేస్తుంది!',
        reasoning_steps: [
          '1. కోడ్ ఎక్స్-రే స్కాన్ (`ast_scanner.py`): కామెంట్స్ కాకుండా అసలు కోడ్ నిర్మాణాన్ని తనిఖీ చేస్తుంది.',
          '2. కారణం & వాయిస్ నోట్ (`provenance_miner.py` & `gnani_speech.py`): Git చరిత్రను మరియు 10-సెకన్ల వాయిస్ నోట్‌ను కలుపుతుంది.',
          '3. భద్రతా గేట్ (`mcp_server.py`): AI ఏజెంట్లు ముఖ్యమైన కోడ్‌ను తొలగించకుండా ప్రీ-కమిట్ దశలోనే అడ్డుకుంటుంది.',
        ],
        spoken_reply:
          'ఈ కోడ్‌బేస్ ఎలా పనిచేస్తుందో ఒక సులభమైన ఉదాహరణతో తెలుసుకుందాం. ఒక ఆటోమేటిక్ రోబో భవనాన్ని శుభ్రం చేస్తూ ఇంటి పైకప్పును మోసే ముఖ్యమైన స్తంభాన్ని తొలగించబోతుంటే, WhyLine ఒక సెక్యూరిటీ గార్డ్ లాగా అసలు ఇంజనీర్ వాయిస్ నోట్‌ను తనిఖీ చేసి ఆ ప్రమాదాన్ని ముందే ఆపేస్తుంది!',
      },
      hi: {
        simple_explanation:
          `आसान शब्दों में: ${repoSlug} आपके कोडबेस का एक समझदार सुरक्षा कवच है। यह कोड में छिपे ज़रूरी जुगाड़ (जैसे रीट्राई लूप या विराम) को पहचानता है, Git इतिहास से पता लगाता है कि उन्हें क्यों लिखा गया था, इंजीनियर के 10-सेकंड के हिंदी/तेलुगु/इंग्लिश वॉइस नोट को जोड़ता है, और AI कोडिंग बॉट्स को गलती से उन्हें मिटाने से रोकता है!`,
        real_world_example:
          'आसान उदाहरण: मान लीजिए एक ऑटोमैटिक रोबोट किसी अस्पताल की इमारत का नवीनीकरण कर रहा है। वह कमरे के बीच एक अजीब खंभा देखकर उसे "साफ़" करने के लिए गिराना चाहता है। WhyLine उस वरिष्ठ इंजीनियर की तरह है जो तुरंत पुराना नक्शा देखता है, मूल इंजीनियर का वॉइस नोट सुनाता है कि "यह खंभा छत को संभाले हुए है!", और रोबोट को वहीं रोक देता है।',
        reasoning_steps: [
          '1. कोड का एक्स-रे स्कैन (`ast_scanner.py`): केवल कमेंट्स नहीं, बल्कि कोड की असली बनावट की जाँच करता है।',
          '2. कारण और वॉइस नोट (`provenance_miner.py` व `gnani_speech.py`): पुराने PR इतिहास और 10-सेकंड के वॉइस नोट को जोड़ता है।',
          '3. सुरक्षा गेट (`mcp_server.py`): AI एजेंट को ज़रूरी सुरक्षा कोड हटाने से पहले ही रोक देता है।',
        ],
        spoken_reply:
          'आइए इस कोडबेस को एक आसान उदाहरण से समझें। जैसे कोई ऑटोमैटिक रोबोट कमरे को सुंदर बनाने के चक्कर में छत को सहारा देने वाला मुख्य खंभा हटाने लगे, तो WhyLine एक समझदार गार्ड की तरह पुराने इंजीनियर का वॉइस नोट सुनाकर उस खंभे को टूटने से बचा लेता है!',
      },
    },
  };

  const langKey = isTe ? 'te' : isHi ? 'hi' : 'en';
  const selected = (catalog[topic] || catalog.double_charge_retry)[langKey];

  return {
    topic,
    language: bcp47,
    reasoning_engine: 'gemini-3.8-flash (ThinkingLevel.HIGH)',
    simple_explanation: selected.simple_explanation,
    real_world_example: selected.real_world_example,
    reasoning_steps: selected.reasoning_steps,
    spoken_reply: selected.spoken_reply,
  };
}

/**
 * Enriches the 5-step repository flowchart with simple everyday explanations
 * and real-world analogies in English (en-IN), Telugu (te-IN), and Hindi (hi-IN),
 * so clicking or playing any step speaks a clear, relatable explanation with an example.
 */
export function getStepSimpleExplanationAndExample(stepNumber = 1, isWhylineRepo = true, language = 'en-IN') {
  const bcp47 = toBcp47(language);
  const isTe = bcp47 === 'te-IN';
  const isHi = bcp47 === 'hi-IN';
  const langKey = isTe ? 'te' : isHi ? 'hi' : 'en';

  const whylineSteps = {
    1: {
      en: {
        simple_explanation:
          'Instead of reading code comments (which can be outdated), this module X-rays the actual structure of your code to spot unusual retry loops or pauses.',
        real_world_example:
          'Example: Like an airport X-ray scanner that inspects what is actually inside a suitcase rather than just trusting the paper luggage tag on the handle.',
        spoken_narration:
          'Step 1, explained simply: Think of the AST Scanner like an airport X-ray machine. Instead of trusting paper luggage tags or code comments, it looks inside the actual structure of your code to find hidden survival fixes like retry loops and pauses.',
      },
      te: {
        simple_explanation:
          'పాతబడిపోయిన కోడ్ కామెంట్స్‌ను చదవకుండా, ఈ మాడ్యూల్ నేరుగా కోడ్ నిర్మాణాన్ని (AST) ఎక్స్-రే తీసి అందులో ఉన్న రీట్రై లూప్‌లు మరియు విరామాలను గుర్తిస్తుంది.',
        real_world_example:
          'ఉదాహరణ: ఎయిర్‌పోర్ట్‌లో బ్యాగ్ పైన ఉన్న పేపర్ ట్యాగ్‌ను నమ్మకుండా, ఎక్స్-రే స్కానర్‌తో బ్యాగ్ లోపల అసలు ఏముందో తనిఖీ చేయడం లాంటిది!',
        spoken_narration:
          'దశ 1, సరళమైన మాటల్లో: AST స్కానర్‌ను ఎయిర్‌పోర్ట్ ఎక్స్-రే మిషన్‌లా ఊహించుకోండి. ఇది కోడ్ కామెంట్స్‌ను కాకుండా అసలు కోడ్ నిర్మాణాన్ని పరీక్షించి, అందులో దాగి ఉన్న ముఖ్యమైన రీట్రై లూప్‌లను గుర్తిస్తుంది.',
      },
      hi: {
        simple_explanation:
          'पुराने कोड कमेंट्स को पढ़ने के बजाय, यह मॉड्यूल सीधे आपके कोड की असली बनावट (AST) का एक्स-रे करता है और छिपे हुए रीट्राई लूप या विराम को पकड़ता है।',
        real_world_example:
          'उदाहरण: जैसे एयरपोर्ट पर सूटकेस के बाहर लगे कागज़ के टैग पर भरोसा करने के बजाय एक्स-रे मशीन से सूटकेस के अंदर की असली चीज़ जाँची जाती है!',
        spoken_narration:
          'चरण 1, आसान शब्दों में: AST स्कैनर को एयरपोर्ट की एक्स-रे मशीन की तरह समझें। यह केवल बाहरी कमेंट्स नहीं पढ़ता, बल्कि कोड की अंदरूनी बनावट को जाँचकर ज़रूरी सुरक्षा लूप को पहचानता है।',
      },
    },
    2: {
      en: {
        simple_explanation:
          'Once an unusual piece of code is found, this module acts like a detective—checking old commits, pull requests, and outage logs to learn WHY a human wrote it.',
        real_world_example:
          'Example: Like a doctor reading a patient’s past medical chart before changing a prescription, so they know why that medicine was prescribed in the first place.',
        spoken_narration:
          'Step 2, in simple terms: The Provenance Miner works like a careful detective or a doctor checking a patient’s old medical chart. Before anyone changes a strange line of code, it checks git history and incident logs to discover why it was written.',
      },
      te: {
        simple_explanation:
          'ఒక వింతైన కోడ్ కనిపించగానే, ఈ మాడ్యూల్ ఒక డిటెక్టివ్ లాగా పాత కమిట్‌లు, PR చర్చలు మరియు ఇన్సిడెంట్ రికార్డులను వెతికి అది ఎందుకు రాశారో కనుగొంటుంది.',
        real_world_example:
          'ఉదాహరణ: డాక్టర్ మందులు మార్చే ముందు పేషెంట్ పాత మెడికల్ ఫైల్ చూసి ఆ మందు ఎందుకు ఇచ్చారో తెలుసుకోవడం లాంటిది!',
        spoken_narration:
          'దశ 2, సులభమైన ఉదాహరణతో: డాక్టర్ మందులు మార్చే ముందు పాత మెడికల్ రిపోర్ట్ చూసినట్లుగా, ప్రొవెనెన్స్ మైనర్ పాత గిట్ చరిత్ర మరియు PR #212 రికార్డులను పరిశీలించి ఆ కోడ్ ఎందుకు రాశారో బయటకు తీస్తుంది.',
      },
      hi: {
        simple_explanation:
          'जब कोई अनोखा कोड मिलता है, तो यह मॉड्यूल एक जासूस की तरह पुराने कमिट, PR चर्चाओं और आउटेज रिकॉर्ड को खंगालता है ताकि पता चले कि उसे क्यों लिखा गया था।',
        real_world_example:
          'उदाहरण: जैसे कोई डॉक्टर दवाई बदलने से पहले मरीज़ की पुरानी फ़ाइल देखता है कि पहली दवाई किस बीमारी के लिए दी गई थी!',
        spoken_narration:
          'चरण 2, आसान उदाहरण के साथ: जैसे डॉक्टर दवाई बदलने से पहले मरीज़ की पुरानी फ़ाइल देखता है, वैसे ही प्रोवेनेंस माइनर पुराने गिट इतिहास और PR #212 से पता लगाता है कि वह कोड असल में क्यों लिखा गया था।',
      },
    },
    3: {
      en: {
        simple_explanation:
          'Lets engineers explain the code in a quick 10-second voice note in English, Telugu, or Hindi, and automatically converts spoken words into exact code variable names.',
        real_world_example:
          'Example: Like a smart bilingual stenographer who listens to you say "retry count" in casual Telugu or Hindi conversation and neatly types `retryCount` into the official record.',
        spoken_narration:
          'Step 3, in simple words: The Gnani Voice Engine acts like a bilingual stenographer. An engineer can speak for 10 seconds in Telugu, Hindi, or English, and it automatically links their spoken words to exact code variables like retryCount.',
      },
      te: {
        simple_explanation:
          'ఇంజనీర్లు తమ మాతృభాషలో (తెలుగు, హిందీ లేదా ఇంగ్లీష్) 10 సెకన్ల వాయిస్ నోట్ చెబితే చాలు, ఇది మాటల్లోని పదాలను కచ్చితమైన కోడ్ వేరియబుల్ పేర్లుగా మారుస్తుంది.',
        real_world_example:
          'ఉదాహరణ: మీరు తెలుగులో మామూలుగా మాట్లాడుతున్నా, అందులోని సాంకేతిక పదాలను కచ్చితంగా గుర్తించి రాసుకునే ఒక తెలివైన స్టెనోగ్రాఫర్ లాంటిది!',
        spoken_narration:
          'దశ 3, సరళంగా చెప్పాలంటే: Gnani వాయిస్ ఇంజిన్ ఒక తెలివైన దుబాసీ లాగా పనిచేస్తుంది. మీరు తెలుగు, హిందీ లేదా ఇంగ్లీష్‌లో 10 సెకన్లు మాట్లాడితే, అది మీ మాటలను నేరుగా కోడ్ వేరియబుల్స్‌తో అనుసంధానిస్తుంది.',
      },
      hi: {
        simple_explanation:
          'इंजीनियर अपनी भाषा (हिंदी, तेलुगु या इंग्लिश) में केवल 10 सेकंड का वॉइस नोट बोल सकते हैं, और यह बोले गए शब्दों को सटीक कोड वेरिएबल नामों में बदल देता है।',
        real_world_example:
          'उदाहरण: एक ऐसे समझदार द्विभाषी स्टेनोग्राफर की तरह जो आपकी आम बातचीत में बोले गए "रीट्राई काउंट" को सुनकर रिकॉर्ड में सटीक `retryCount` लिख देता है!',
        spoken_narration:
          'चरण 3, आसान शब्दों में: Gnani वॉइस इंजन एक समझदार दुभाषिए की तरह काम करता है। जब इंजीनियर हिंदी, तेलुगु या इंग्लिश में 10 सेकंड का वॉइस नोट बोलते हैं, तो यह उसे सीधे सही कोड वेरिएबल से जोड़ देता है।',
      },
    },
    4: {
      en: {
        simple_explanation:
          'Turns the engineer’s spoken voice note into a real automated test and links it to your config file so the rule automatically retires when you upgrade.',
        real_world_example:
          'Example: Like setting a smart reminder lock on a temporary road detour sign that automatically unlocks the day the new highway bridge opens.',
        spoken_narration:
          'Step 4, in simple terms: The Fence Compiler turns your spoken voice note into an automatic test with a smart expiration date—like a road detour sign that automatically unlocks as soon as the new v2 highway bridge opens!',
      },
      te: {
        simple_explanation:
          'ఇంజనీర్ చెప్పిన వాయిస్ నోట్‌ను ఆటోమేటిక్ టెస్ట్‌గా మార్చి, కాన్ఫిగ్ ఫైల్‌తో జతచేస్తుంది. కొత్త వెర్షన్ (v2) రాగానే ఈ పాత నియమం ఆటోమేటిక్‌గా గడువు ముగుస్తుంది.',
        real_world_example:
          'ఉదాహరణ: కొత్త వంతెన నిర్మాణం పూర్తయిన వెంటనే పాత డైవర్షన్ బోర్డు ఆటోమేటిక్‌గా తొలగిపోయే స్మార్ట్ లాక్ లాంటిది!',
        spoken_narration:
          'దశ 4, సులభమైన ఉదాహరణతో: కొత్త హైవే వంతెన ప్రారంభం కాగానే పాత డైవర్షన్ బోర్డు ఆటోమేటిక్‌గా తొలగిపోయినట్లుగా, ఫెన్స్ కంపైలర్ మీ వాయిస్ నోట్‌ను ఆటో-ఎక్స్‌పైరీ టెస్ట్‌గా మారుస్తుంది.',
      },
      hi: {
        simple_explanation:
          'यह इंजीनियर के वॉइस नोट को एक ऑटोमैटिक टेस्ट में बदल देता है और कॉन्फ़िग फ़ाइल से जोड़ देता है, ताकि नया सिस्टम (v2) आते ही पुराना नियम अपने-आप हट सके।',
        real_world_example:
          'उदाहरण: सड़क के उस स्मार्ट डायवर्जन बोर्ड की तरह जो नया पुल खुलते ही अपने-आप अनलॉक हो जाता है!',
        spoken_narration:
          'चरण 4, आसान उदाहरण के साथ: जैसे नया पुल खुलते ही पुराना डायवर्जन बोर्ड अपने-आप हट जाता है, वैसे ही फ़ेंस कंपाइलर आपके वॉइस नोट को ऑटो-एक्सपायरी टेस्ट में बदल देता है।',
      },
    },
    5: {
      en: {
        simple_explanation:
          'Stands guard right before code is committed. If an AI coding bot tries to delete a protected line, it stops the commit and explains why the line is needed.',
        real_world_example:
          'Example: Like a railway crossing barrier that automatically lowers when an AI train approaches a protected track, preventing a crash before it happens.',
        spoken_narration:
          'Step 5, in simple words: The FastMCP Pre-Commit Guard is like an automatic railway crossing gate. Whenever an AI coding agent tries to delete a protected workaround, the gate drops immediately and prevents a production outage!',
      },
      te: {
        simple_explanation:
          'కోడ్ సేవ్ (commit) అయ్యే ముందే కాపలాగా ఉంటుంది. ఏదైనా AI ఏజెంట్ రక్షిత కోడ్‌ను తొలగించబోతే వెంటనే ఆపి, ఆ కోడ్ ఎందుకు అవసరమో వివరిస్తుంది.',
        real_world_example:
          'ఉదాహరణ: రైలు వచ్చే ముందు ఆటోమేటిక్‌గా మూసుకునే రైల్వే గేట్ లాగా, AI ఏజెంట్ తప్పు చేయకముందే ప్రమాదాన్ని ఆపేస్తుంది!',
        spoken_narration:
          'దశ 5, సరళమైన మాటల్లో: FastMCP ప్రీ-కమిట్ గార్డ్ ఒక ఆటోమేటిక్ రైల్వే గేట్ లాంటిది. AI కోడింగ్ ఏజెంట్ రక్షిత కోడ్‌ను తొలగించబోయిన వెంటనే గేట్ వేసి ప్రొడక్షన్ అవుటేజ్ రాకుండా కాపాడుతుంది!',
      },
      hi: {
        simple_explanation:
          'यह कोड कमिट होने से ठीक पहले पहरा देता है। अगर कोई AI बॉट सुरक्षित लाइन को मिटाने की कोशिश करता है, तो यह तुरंत कमिट को रोककर असली कारण बताता है।',
        real_world_example:
          'उदाहरण: रेलवे फाटक की तरह जो ट्रेन आने से पहले ही बंद हो जाता है और दुर्घटना होने से बचा लेता है!',
        spoken_narration:
          'चरण 5, आसान शब्दों में: FastMCP प्री-कमिट गार्ड एक ऑटोमैटिक रेलवे फाटक की तरह है। जब भी कोई AI एजेंट सुरक्षित कोड को हटाने की कोशिश करता है, यह तुरंत फाटक बंद करके प्रोडक्शन आउटेज को रोक लेता है!',
      },
    },
  };

  const healthConnectSteps = {
    1: {
      en: {
        simple_explanation:
          'Gives rural satellite clinics a 3-minute clock grace period so their login tokens still work even when satellite internet blocks automatic clock sync.',
        real_world_example:
          'Example: Like a train conductor giving a 3-minute grace window to passengers arriving from a village whose station clock runs 2 minutes slow.',
        spoken_narration:
          'Step 1, in simple terms: Think of a train conductor giving a 3-minute grace period because the village station clock runs two minutes slow. This 180-second filter keeps 14 rural satellite clinics logged in during emergencies!',
      },
      te: {
        simple_explanation:
          'గ్రామీణ శాటిలైట్ ఆసుపత్రుల కంప్యూటర్ గడియారాలు 2 నిమిషాలు వెనుకబడినా డాక్టర్ల లాగిన్ ఆగిపోకుండా 3 నిమిషాల గ్రేస్ టైమ్ ఇస్తుంది.',
        real_world_example:
          'ఉదాహరణ: పల్లెటూరి గడియారం 2 నిమిషాలు ఆలస్యంగా నడుస్తున్నప్పుడు స్కూల్ గేట్ వద్ద 3 నిమిషాల వెసులుబాటు ఇవ్వడం లాంటిది!',
        spoken_narration:
          'దశ 1, సరళమైన ఉదాహరణతో: పల్లెటూరి బస్సు గడియారం రెండు నిమిషాలు ఆలస్యంగా ఉన్నప్పుడు గేట్ వద్ద 3 నిమిషాల గ్రేస్ టైమ్ ఇచ్చినట్లుగా, ఈ 180 సెకన్ల ఫిల్టర్ 14 గ్రామీణ క్లినిక్‌ల లాగిన్ ఆగిపోకుండా కాపాడుతుంది.',
      },
      hi: {
        simple_explanation:
          'ग्रामीण सैटेलाइट अस्पतालों की घड़ी 2 मिनट पीछे होने पर भी डॉक्टरों का लॉगिन चालू रखने के लिए 3 मिनट की छूट देता है।',
        real_world_example:
          'उदाहरण: जैसे गाँव के स्टेशन की घड़ी 2 मिनट पीछे चलने पर ट्रेन कंडक्टर यात्रियों को 3 मिनट की छूट देता है!',
        spoken_narration:
          'चरण 1, आसान उदाहरण के साथ: जैसे गाँव की घड़ी 2 मिनट पीछे चलने पर गेट पर 3 मिनट की छूट दी जाती है, वैसे ही यह 180 सेकंड का नियम 14 ग्रामीण अस्पतालों का आपातकालीन लॉगिन चालू रखता है।',
      },
    },
    2: {
      en: {
        simple_explanation:
          'Retries hospital payments up to 5 times at midnight because the old bank load balancer drops 1 out of 4 packets during midnight traffic.',
        real_world_example:
          'Example: Like redialing a busy night-shift bank phone line up to 5 times with the same receipt number so your bill gets paid once without failing.',
        spoken_narration:
          'Step 2, explained simply: At midnight the bank server drops every fourth message. So our router acts like redialing a busy phone line up to 5 times with the same receipt stamp, ensuring the hospital payment succeeds safely!',
      },
      te: {
        simple_explanation:
          'అర్ధరాత్రి బ్యాంక్ సర్వర్ రద్దీగా ఉండి ప్రతి 4 మెసేజ్‌లలో ఒకదానిని మిస్ చేస్తుంది కాబట్టి, పేమెంట్ కచ్చితంగా వెళ్ళడానికి 5 సార్లు ప్రయత్నిస్తుంది.',
        real_world_example:
          'ఉదాహరణ: అర్ధరాత్రి బిజీగా ఉన్న బ్యాంక్ ఫోన్ లైన్‌కు 5 సార్లు డయల్ చేసి, ఒకే రసీదు నంబర్‌తో బిల్లు కట్టడం లాంటిది!',
        spoken_narration:
          'దశ 2, సులభమైన మాటల్లో: అర్ధరాత్రి బిజీగా ఉన్న ఫోన్ లైన్‌కు 5 సార్లు ప్రయత్నించినట్లుగా, ఈ గేట్‌వే రౌటర్ పేమెంట్ మిస్ అవ్వకుండా 5 సార్లు పంపి సురక్షితంగా పూర్తి చేస్తుంది.',
      },
      hi: {
        simple_explanation:
          'आधी रात को बैंक का पुराना सर्वर हर 4 में से 1 संदेश गिरा देता है, इसलिए पेमेंट सफल करने के लिए यह 5 बार प्रयास करता है।',
        real_world_example:
          'उदाहरण: जैसे रात को व्यस्त बैंक फ़ोन लाइन पर एक ही रसीद नंबर के साथ 5 बार कॉल करना ताकि पेमेंट पक्का हो जाए!',
        spoken_narration:
          'चरण 2, आसान शब्दों में: जैसे व्यस्त फ़ोन लाइन पर हम 5 बार कॉल मिलाते हैं ताकि बात पक्की हो जाए, वैसे ही यह राउटर आधी रात के पैकेट ड्रॉप से बचने के लिए 5 बार प्रयास करता है।',
      },
    },
    3: {
      en: {
        simple_explanation:
          'Waits 120 milliseconds before showing an X-ray on clinic tablets because the tablet graphics chip says "Done!" slightly before the image finishes loading.',
        real_world_example:
          'Example: Like waiting 1 second for fresh ink on a photo printout to dry before touching it so the image does not smudge.',
        spoken_narration:
          'Step 3, in simple words: Like waiting a split-second for fresh printer ink to dry before handing an X-ray to the doctor, this 120-millisecond pause stops tablet radiology scans from smudging!',
      },
      te: {
        simple_explanation:
          'క్లినిక్ టాబ్లెట్లలో ఎక్స్-రే బొమ్మ మెమరీలో పూర్తిగా లోడ్ అవ్వడానికి 120 మిల్లీసెకన్లు ఆగుతుంది, తద్వారా బొమ్మ చెదిరిపోదు.',
        real_world_example:
          'ఉదాహరణ: ప్రింటర్ నుండి వచ్చిన ఫోటోపై ఇంక్ ఆరడానికి ఒక్క క్షణం ఆగడం లాంటిది!',
        spoken_narration:
          'దశ 3, సరళంగా చెప్పాలంటే: ప్రింటర్ నుండి వచ్చిన ఫోటోపై ఇంక్ ఆరడానికి ఒక్క క్షణం ఆగినట్లుగా, ఈ 120 మిల్లీసెకన్ల విరామం డాక్టర్ టాబ్లెట్‌లో ఎక్స్-రే స్పష్టంగా కనిపించేలా చేస్తుంది.',
      },
      hi: {
        simple_explanation:
          'क्लिनिक टैबलेट पर एक्स-रे दिखाने से पहले 120 मिलीसेकंड रुकता है ताकि अधूरा चित्र लोड होने से स्क्रीन पर काली लाइनें न आएँ।',
        real_world_example:
          'उदाहरण: जैसे प्रिंटर से निकली ताज़ा तस्वीर की स्याही सूखने के लिए एक पल रुकना ताकि तस्वीर साफ़ रहे!',
        spoken_narration:
          'चरण 3, आसान शब्दों में: जैसे ताज़ा प्रिंट की स्याही सूखने के लिए हम पल भर रुकते हैं, वैसे ही यह 120 मिलीसेकंड का विराम डॉक्टर के टैबलेट पर एक्स-रे को धुंधला होने से बचाता है।',
      },
    },
    4: {
      en: {
        simple_explanation:
          'Adds a microscopic 0.00001 nudge during tax rounding so our hospital bill matches the State Treasury portal down to the exact paisa.',
        real_world_example:
          'Example: Like calibrating two shop weighing scales so a 1-gram difference never causes the government auditor to reject the shipment.',
        spoken_narration:
          'Step 4, in simple terms: Even a 1-paisa rounding difference makes the government portal reject a hospital bill. This tiny 0.00001 nudge calibrates our calculator to match the State Treasury every single time!',
      },
      te: {
        simple_explanation:
          'ప్రభుత్వ ట్రెజరీ పోర్టల్ లెక్కతో ఒక్క పైసా కూడా తేడా రాకుండా ఉండేందుకు ట్యాక్స్ రౌండింగ్‌లో చిన్న 0.00001 విలువను కలుపుతుంది.',
        real_world_example:
          'ఉదాహరణ: దుకాణంలో రెండు కాంటాలను ఒకే కొలతకు సెట్ చేయడం వల్ల ఆడిట్‌లో బిల్లు ఆగిపోకుండా ఉండటం లాంటిది!',
        spoken_narration:
          'దశ 4, సులభమైన ఉదాహరణతో: ప్రభుత్వ పోర్టల్‌లో ఒక్క పైసా తేడా వచ్చినా బిల్లు ఆగిపోతుంది కాబట్టి, రెండు కాంటాలను సమానంగా సెట్ చేసినట్లుగా ఈ చిన్న 0.00001 విలువ లెక్కను కచ్చితంగా ఉంచుతుంది.',
      },
      hi: {
        simple_explanation:
          'टैक्स की गणना में सूक्ष्म 0.00001 जोड़ता है ताकि अस्पताल का बिल सरकारी ट्रेजरी पोर्टल से एक-एक पैसे तक मेल खाए।',
        real_world_example:
          'उदाहरण: जैसे दो तराजू को बिल्कुल बराबर सेट करना ताकि 1 पैसे के अंतर से भी सरकारी सब्सिडी न रुके!',
        spoken_narration:
          'चरण 4, आसान उदाहरण के साथ: सरकारी पोर्टल पर 1 पैसे के अंतर से भी बिल रुक जाता है। जैसे दो तराजू को बराबर मिलाया जाता है, वैसे ही यह सूक्ष्म संख्या हमारे और सरकारी पोर्टल के हिसाब को एक समान रखती है।',
      },
    },
    5: {
      en: {
        simple_explanation:
          'Watches `application.yml` and only unlocks the midnight retry fence after the payment gateway is officially upgraded from v1 to v2.',
        real_world_example:
          'Example: Like a safety lock on a scaffold that only releases once sensors confirm the new permanent roof is bolted in place.',
        spoken_narration:
          'Step 5, in simple words: Think of a safety lock on building scaffolding that only unlocks after the new roof is finished. Once application.yml upgrades to v2, FENCE-001 safely expires automatically!',
      },
      te: {
        simple_explanation:
          '`application.yml` లో గేట్‌వే v2 కి మారే వరకు పాత రక్షణ నియమాన్ని కాపాడుతుంది, v2 రాగానే ఆటోమేటిక్‌గా అన్‌లాక్ చేస్తుంది.',
        real_world_example:
          'ఉదాహరణ: భవనం కొత్త పైకప్పు పూర్తయ్యే వరకు తాత్కాలిక సపోర్ట్ కర్రలను తీయకుండా ఉంచే సేఫ్టీ లాక్ లాంటిది!',
        spoken_narration:
          'దశ 5, సరళమైన మాటల్లో: కొత్త పైకప్పు పూర్తయిన తర్వాతే సపోర్ట్ కర్రలను తీసే సేఫ్టీ లాక్ లాగా, application.yml లో v2 వచ్చిన తర్వాతే FENCE-001 ఆటోమేటిక్‌గా ముగుస్తుంది.',
      },
      hi: {
        simple_explanation:
          'जब तक `application.yml` में गेटवे v2 लाइव नहीं हो जाता तब तक सुरक्षा नियम को बनाए रखता है, और v2 आते ही उसे सुरक्षित रूप से अनलॉक कर देता है।',
        real_world_example:
          'उदाहरण: इमारत की नई छत पक्की होने तक अस्थायी बल्लियों को सुरक्षित रखने वाले स्मार्ट लॉक की तरह!',
        spoken_narration:
          'चरण 5, आसान शब्दों में: जैसे नई छत पूरी तरह बनने के बाद ही सहारे की बल्लियाँ हटाई जाती हैं, वैसे ही application.yml में v2 आने पर ही FENCE-001 सुरक्षित रूप से समाप्त होता है।',
      },
    },
  };

  const stepMap = isWhylineRepo ? whylineSteps : healthConnectSteps;
  const entry = (stepMap[stepNumber] || stepMap[1])[langKey];
  return entry;
}
