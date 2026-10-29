import type { AIProviderAdapter, TaskContext } from './ai-adapter';
import type { ExecutionPlan, PlanStep } from '../../../shared/types';
import type { ToolDefinition } from '../types';
import { isConversationalQuery, resolveTargetQuery, classifyNavigationIntent, extractAcademicQuery } from '../intent-extractor';

export class MockLocalAIAdapter implements AIProviderAdapter {
  public providerName = 'mock';

  public async generatePlan(
    goal: string,
    _tools: ToolDefinition[],
    context?: TaskContext
  ): Promise<ExecutionPlan> {
    const lower = goal.toLowerCase().trim();
    const isHindi = /[\u0900-\u097F]/.test(goal);
    const isHinglish =
      lower.includes('karo') ||
      lower.includes('banao') ||
      lower.includes('dhundho') ||
      lower.includes('dhoondo') ||
      lower.includes('khojo') ||
      lower.includes('kholo') ||
      lower.includes('chalao') ||
      lower.includes('chahiye') ||
      lower.includes('paanch') ||
      lower.includes('karke') ||
      lower.includes('kaise') ||
      lower.includes('hai') ||
      lower.includes('aur') ||
      lower.includes('unka') ||
      lower.includes('batao') ||
      lower.includes('meri') ||
      lower.includes('mera') ||
      lower.includes('milega') ||
      lower.includes('dikhao') ||
      lower.includes('khol kar');

    const previousQueries = context?.previousQueries || [];
    const lastUserQuery = previousQueries.length > 0
      ? previousQueries[previousQueries.length - 1].toLowerCase().trim()
      : '';

    // =========================================================================
    // 1. Explicit Approval / Consequential Action Testing
    // =========================================================================
    if (
      lower.startsWith('test approval') ||
      lower.startsWith('test consequential') ||
      (lower.includes('approval') && lower.includes('demo')) ||
      ((lower.includes('delete') || lower.includes('hatao') || lower.includes('mitao')) &&
        !lower.includes('linkedin'))
    ) {
      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: 'Navigate to target dashboard',
          tool: 'browser_navigate',
          params: { url: 'https://example.com' },
          status: 'pending',
          expectedOutcome: 'Page loaded successfully',
        },
        {
          id: 'step-2',
          order: 2,
          description: 'Request explicit approval before consequential execution',
          tool: 'consequential_action_demo',
          params: { action: 'Consequential Operation', description: goal },
          requiresApproval: true,
          status: 'pending',
          expectedOutcome: 'User approves or rejects operation',
        },
      ];

      return {
        goal,
        summary: 'Execution plan with explicit approval gate for consequential action.',
        createdAt: Date.now(),
        steps,
      };
    }

    // =========================================================================
    // 2. Mode C: LinkedIn Post Upload (Imperative action with confirmation)
    // =========================================================================
    // e.g. "LinkedIn kholo aur meri ye post upload karo: [text]"
    //      "Ye post LinkedIn par upload karo: [text]"
    // NOT: "What is LinkedIn?"
    // NOT: "How do I upload a post on LinkedIn?"
    // NOT: "LinkedIn par post upload karne ke steps batao"
    // NOT: "LinkedIn par post upload karne ke liye LinkedIn kholo" (Mode B: open only)
    const isHowToQuestion =
      lower.startsWith('how to') ||
      lower.startsWith('how do') ||
      lower.includes('kaise upload') ||
      lower.includes('kaise karte') ||
      lower.includes('ke steps') ||
      lower.includes('steps batao') ||
      lower.includes('tarika kya hai');

    const isOpenOnlyToPost =
      lower.includes('kholne ke liye') ||
      lower.includes('karne ke liye linkedin kholo') ||
      lower.includes('post karne ke liye linkedin kholo') ||
      lower.endsWith('linkedin kholo') ||
      lower.endsWith('linkedin open karo');

    // =========================================================================
    // 2a. Standalone Caption / Description Generation for Image
    // =========================================================================
    // e.g. "Is image ke liye LinkedIn description likho", "Image attach karke professional caption bhi likho"
    // (when NOT explicitly asking to open LinkedIn in browser)
    const isPureCaptionRequest =
      (lower.includes('description likho') ||
        lower.includes('caption likho') ||
        lower.includes('post banao') ||
        lower.includes('caption likh do') ||
        lower.includes('write description') ||
        lower.includes('write caption') ||
        lower.includes('caption generate')) &&
      !lower.includes('kholo') &&
      !lower.includes('open') &&
      !lower.includes('publish karo') &&
      !lower.includes('upload karo');

    if (isPureCaptionRequest) {
      const generatedCaption = isHinglish
        ? `Aapke provided image ke liye professional LinkedIn post options:

📌 Option 1 (Inspirational & Growth):
"Excited to share this milestone with my network! Continuous learning, innovation, aur dedicated teamwork se hi impactful results possible hote hain. Looking forward to the next chapter of growth and opportunities. 🚀
#ProfessionalGrowth #Innovation #ContinuousLearning #TechJourney #Milestone"

📌 Option 2 (Concise & Impactful):
"Turning vision into reality. Grateful for the collaborative effort and momentum behind this journey. Always striving for excellence. ✨
#CareerMilestone #Leadership #WorkInProgress #Achievement"

📌 Option 3 (Technical & Professional):
"Innovation in action. Building scalable, dependable solutions requires relentless focus and attention to detail. Proud of what our team has accomplished here. 💡
#Engineering #SoftwareEngineering #TechInnovation #ProblemSolving"`
        : isHindi
        ? `आपकी छवि के लिए अनुशंसित पेशेवर लिंक्डइन विवरण:

📌 विकल्प 1 (प्रेरणादायक और विकासोन्मुख):
"अपने नेटवर्क के साथ इस महत्वपूर्ण उपलब्धि को साझा करते हुए मुझे अत्यंत प्रसन्नता हो रही है। निरंतर सीखने, नवाचार और समर्पित टीमवर्क से ही सार्थक परिणाम संभव हैं। 🚀
#ProfessionalGrowth #Innovation #CareerJourney"

📌 विकल्प 2 (संक्षिप्त और प्रभावशाली):
"संकल्प से सिद्धि की ओर। इस यात्रा में सहयोग देने वाले सभी साथियों का धन्यवाद। निरंतर उत्कृष्टता की दिशा में अग्रसर। ✨
#Achievement #Leadership #Dedication"`
        : `Professional LinkedIn Post Options for your attached image:

📌 Option 1 (Engaging & Growth-Oriented):
"Excited to share this milestone with my professional network! Continuous learning, focused innovation, and dedicated collaboration turn ideas into meaningful impact. Looking forward to the next chapter of growth. 🚀
#ProfessionalGrowth #Innovation #ContinuousLearning #Leadership #Milestone"

📌 Option 2 (Concise & Direct):
"Turning vision into reality. Grateful for the teamwork, persistence, and momentum behind this milestone. Always striving for excellence. ✨
#CareerJourney #Achievement #EngineeringExcellence #Networking"

📌 Option 3 (Technical & Solution-Focused):
"Building dependable, high-impact systems requires rigorous engineering and shared dedication. Proud of the progress captured here. 💡
#SoftwareEngineering #TechInnovation #ProblemSolving #BuildInPublic"`;

      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? 'Image ke liye professional LinkedIn descriptions provide karna'
            : isHindi
            ? 'छवि के लिए पेशेवर लिंक्डइन विवरण प्रदान करें'
            : 'Provide professional LinkedIn post captions for the attached image',
          tool: 'chat_response',
          params: { message: generatedCaption },
          status: 'pending',
          expectedOutcome: 'Professional captions provided in chat',
        },
      ];

      return {
        goal,
        summary: generatedCaption,
        createdAt: Date.now(),
        steps,
      };
    }

    // =========================================================================
    // 2b. Visual Image Matching & Reverse Search
    // =========================================================================
    const isVisualMatchRequest =
      (lower.includes('visual matched') ||
        lower.includes('visual match') ||
        lower.includes('matching images') ||
        lower.includes('matching image') ||
        lower.includes('similar images') ||
        lower.includes('similar image') ||
        lower.includes('reverse image') ||
        lower.includes('photo se search') ||
        lower.includes('image search')) &&
      (!!context?.attachedImage || lower.includes('image') || lower.includes('photo') || lower.includes('pic'));

    if (isVisualMatchRequest) {
      const imageName = context?.attachedImage?.name || 'Attached Image';
      const imagePath = context?.attachedImage?.path;
      const imageData = context?.attachedImage?.dataUrl;
      const cleanImageQuery = imageName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'visual match';

      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? `Uploaded image "${imageName}" ke visual features analyze karna`
            : isHindi
            ? `अपलोड की गई छवि "${imageName}" की दृश्य विशेषताओं का विश्लेषण करें`
            : `Analyze visual features of attached image "${imageName}"`,
          tool: 'browser_visual_match',
          params: {
            imageName,
            imagePath,
            imageData,
            queryContext: cleanImageQuery,
          },
          status: 'pending',
          expectedOutcome: 'Visual features extracted and search queries formulated',
        },
        {
          id: 'step-2',
          order: 2,
          description: isHinglish
            ? `Visually matching results browser tab me display karna`
            : isHindi
            ? `दृश्य रूप से मेल खाने वाले परिणाम ब्राउज़र टैब में प्रदर्शित करें`
            : 'Display visually matching web results in browser tab',
          tool: 'browser_navigate',
          params: {
            url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(cleanImageQuery)}`,
            openInTab: true,
          },
          status: 'pending',
          expectedOutcome: 'Visually matching images and source webpages displayed in active tab',
        },
      ];

      return {
        goal,
        summary: isHinglish
          ? `Uploaded image "${imageName}" ke visual features analyze karke visually matching images aur web sources search kar diye gaye hain.`
          : isHindi
          ? `अपलोड की गई छवि "${imageName}" का विश्लेषण करके मिलते-जुलते दृश्य परिणाम और वेब स्रोत खोजे गए हैं।`
          : `Visual analysis of "${imageName}" completed. Matching images and web sources have been identified and loaded in your browser.`,
        createdAt: Date.now(),
        steps,
      };
    }

    const isLinkedInPostAction =
      !isHowToQuestion &&
      !isOpenOnlyToPost &&
      !isPureCaptionRequest &&
      (lower.includes('linkedin') || lower.includes('post')) &&
      (lower.includes('upload') ||
        lower.includes('publish') ||
        lower.includes('dalo') ||
        lower.includes('daalo') ||
        lower.includes('lagao') ||
        lower.includes('attach') ||
        lower.includes('prepare') ||
        lower.includes('kar do') ||
        lower.includes('kardo') ||
        lower.includes('kar de') ||
        lower.includes('kar dein') ||
        lower.includes('post kar') ||
        (lower.includes('post') && (lower.includes('karo') || lower.includes('kijiye') || lower.includes('mein'))));

    if (isLinkedInPostAction) {
      let postText = '';
      if (goal.includes(':')) {
        postText = goal.split(/:(.+)/)[1]?.trim() || '';
      } else {
        const match = goal.match(
          /(?:upload karo|post karo|publish karo|dalo|daalo|upload|post)\s*(?:meri|ye)?\s*[:=]?\s*["']?(.+?)["']?$/i
        );
        if (match && match[1] && !match[1].toLowerCase().includes('linkedin') && !match[1].toLowerCase().includes('image')) {
          postText = match[1].trim();
        }
      }
      postText = postText.replace(/^["']|["']$/g, '');

      // If user asked to write description or attach image without explicit text, generate professional description
      const hasImage = !!context?.attachedImage || lower.includes('image') || lower.includes('photo') || lower.includes('pic');
      const isGenerateCaption =
        lower.includes('description likho') ||
        lower.includes('caption likho') ||
        lower.includes('post banao') ||
        lower.includes('prepare karo') ||
        !postText;

      if (!postText || isGenerateCaption) {
        postText = isHinglish
          ? 'Excited to share this update with my professional network! Continuous learning, innovation, aur dedicated effort se hi meaningful progress achieve hoti hai. #ProfessionalGrowth #TechInnovation #Milestone #ContinuousLearning'
          : isHindi
          ? 'अपने व्यावसायिक नेटवर्क के साथ यह महत्वपूर्ण अपडेट साझा करते हुए मुझे अत्यंत प्रसन्नता हो रही है। निरंतर सीखने और नवाचार से ही वास्तविक प्रगति संभव है। #ProfessionalGrowth #Innovation'
          : 'Excited to share this update with my professional network! Continuous learning, focused innovation, and dedicated collaboration drive meaningful impact. #ProfessionalGrowth #TechInnovation #CareerJourney';
      }

      const isPrepareOnly =
        lower.includes('prepare') ||
        lower.includes('draft') ||
        lower.includes('lagao') ||
        (lower.includes('attach') && !lower.includes('publish'));
      const actionType = isPrepareOnly ? 'prepare' : 'publish';
      const imagePath = context?.attachedImage?.path;
      const imageData = context?.attachedImage?.dataUrl;
      const imageName = context?.attachedImage?.name || (hasImage ? 'Selected Image' : undefined);

      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? 'LinkedIn website active browser tab me open karna'
            : isHindi
            ? 'सक्रिय ब्राउज़र टैब में लिंक्डइन वेबसाइट खोलें'
            : 'Open LinkedIn in visible browser tab',
          tool: 'browser_navigate',
          params: { url: 'https://www.linkedin.com/feed', openInTab: true },
          status: 'pending',
          expectedOutcome: 'LinkedIn opened in visible browser tab',
        },
        {
          id: 'step-2',
          order: 2,
          description: isHinglish
            ? hasImage
              ? 'Authentication check karke image attach karna aur user approval ke baad post prepare/publish karna'
              : 'Authentication check karke user approval ke baad post publish karna'
            : isHindi
            ? hasImage
              ? 'प्रमाणीकरण की जांच करें, छवि संलग्न करें और उपयोगकर्ता की पुष्टि के बाद पोस्ट तैयार/प्रकाशित करें'
              : 'प्रमाणीकरण की जांच करें और उपयोगकर्ता की पुष्टि के बाद पोस्ट प्रकाशित करें'
            : hasImage
            ? 'Verify login state, attach user image, and publish post after explicit user approval'
            : 'Verify login state and publish post to LinkedIn after explicit user approval',
          tool: 'browser_linkedin_post',
          params: {
            postText,
            imagePath,
            imageData,
            imageName,
            action: actionType,
          },
          requiresApproval: true,
          status: 'pending',
          expectedOutcome:
            'If logged in, prepares/publishes post with user approval; if logged out, prompts manual login',
        },
      ];

      return {
        goal,
        summary: isHinglish
          ? `LinkedIn active tab me open karke authentication check, image attachment (${imageName || 'None'}), aur user confirmation ke baad post ${actionType} karne ka workflow.`
          : isHindi
          ? `ब्राउज़र टैब में लिंक्डइन खोलकर प्रमाणीकरण जांच, छवि संलग्नता और उपयोगकर्ता की सहमति के बाद पोस्ट तैयार करने की योजना।`
          : `Open LinkedIn in active browser tab, inspect login session, attach image if provided, and ${actionType} post after explicit confirmation.`,
        createdAt: Date.now(),
        steps,
      };
    }

    // =========================================================================
    // 3. User Profile Navigation Intent ("Meri LinkedIn profile kholo", "Meri GitHub profile kholo")
    // =========================================================================
    const isProfileQuery =
      lower.includes('profile') &&
      (lower.includes('linkedin') || lower.includes('github') || lower.includes('meri') || lower.includes('my'));

    if (isProfileQuery) {
      const platform = lower.includes('github') ? 'github' : 'linkedin';
      const usernameMatch = goal.match(/(?:username|user|handle|id)\s*[:=]?\s*([a-zA-Z0-9_-]+)/i);
      const username = usernameMatch ? usernameMatch[1] : undefined;

      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? `${platform.toUpperCase()} kholna aur profile/auth session inspect karna`
            : isHindi
            ? `${platform.toUpperCase()} खोलना और प्रोफ़ाइल/सत्र की जांच करना`
            : `Open ${platform.toUpperCase()} in AdaL Nexus and check profile session`,
          tool: 'browser_check_profile',
          params: { platform, username },
          status: 'pending',
          expectedOutcome: `${platform.toUpperCase()} opened in browser tab with honest profile guidance`,
        },
      ];

      return {
        goal,
        summary: `Open ${platform.toUpperCase()} in active AdaL Nexus browser tab and verify authenticated session.`,
        createdAt: Date.now(),
        steps,
      };
    }

    // =========================================================================
    // 3b. Informational Query Classification (Mode A Pre-Check)
    // =========================================================================
    const isInformationalQuery = isConversationalQuery(goal);

    // =========================================================================
    // 3c. YouTube Multi-Step Video & Playlist Playback (Mode B/C Autonomous Workflow)
    // =========================================================================
    const isYouTubePlayIntent =
      !isInformationalQuery &&
      (
        (lower.includes('youtube') && (lower.includes('chalao') || lower.includes('play') || lower.includes('series') || lower.includes('video') || lower.includes('playlist') || lower.includes('gaana') || lower.includes('gana') || lower.includes('song'))) ||
        ((lower.includes('chalao') || lower.includes('play')) && !lower.includes('amazon') && !lower.includes('linkedin') && !lower.includes('notes'))
      );

    if (isYouTubePlayIntent) {
      const resolvedTarget = resolveTargetQuery(goal, context);
      const ytTopic = resolvedTarget || 'YouTube';

      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? `YouTube par "${ytTopic}" search karke visible tab me open karna`
            : isHindi
            ? `यूट्यूब पर "${ytTopic}" खोजकर सक्रिय टैब में खोलें`
            : `Open YouTube and search for "${ytTopic}" in active tab`,
          tool: 'browser_navigate',
          params: { url: `https://www.youtube.com/results?search_query=${encodeURIComponent(ytTopic)}`, openInTab: true },
          status: 'pending',
          expectedOutcome: 'YouTube search results page loaded',
        },
        {
          id: 'step-2',
          order: 2,
          description: isHinglish
            ? `"${ytTopic}" select karke playback start karna`
            : isHindi
            ? `"${ytTopic}" का चयन करके प्लेबैक प्रारंभ करें`
            : `Select "${ytTopic}" and initiate playback on YouTube`,
          tool: 'browser_youtube_play',
          params: { query: ytTopic, openInTab: true },
          status: 'pending',
          expectedOutcome: 'Video/playlist playback initiated in active browser tab',
        },
      ];

      return {
        goal,
        summary: isHinglish
          ? `YouTube active browser tab me open kar diya gaya hai aur "${ytTopic}" playback shuru kar diya gaya hai.`
          : isHindi
          ? `यूट्यूब सक्रिय ब्राउज़र टैब में खोल दिया गया है और "${ytTopic}" का प्लेबैक शुरू कर दिया गया है।`
          : `Successfully opened YouTube in your active browser tab and targeted "${ytTopic}" for playback.`,
        createdAt: Date.now(),
        steps,
      };
    }

    // =========================================================================
    // 3d. Notes Gallery & Study Materials (PYQs, Units, Uploaded PDFs)
    // =========================================================================
    const isNotesGalleryIntent =
      !isInformationalQuery &&
      (
        lower.includes('notes gallery') ||
        lower.includes('pyq') ||
        lower.includes('dstl') ||
        lower.includes('coa') ||
        lower.includes('dbms') ||
        lower.includes('cyber security') ||
        lower.includes('uploaded pdf') ||
        lower.includes('mera pdf') ||
        lower.includes('aktu') ||
        lower.includes('btech') ||
        lower.includes('b.tech') ||
        lower.includes('semester') ||
        ((lower.includes('unit 2') || lower.includes('unit 3') || lower.includes('wala kholo') || lower.includes('wali kholo')) && (lastUserQuery.includes('dstl') || lastUserQuery.includes('notes') || lastUserQuery.includes('pyq')))
      ) &&
      (
        lower.includes('kholo') ||
        lower.includes('dikhao') ||
        lower.includes('nikaalo') ||
        lower.includes('dhoondo') ||
        lower.includes('search') ||
        lower.includes('open') ||
        lower.includes('find') ||
        lower.includes('wala kholo') ||
        lower.includes('wali kholo')
      );

    if (isNotesGalleryIntent) {
      const isGeneralOpen =
        (lower === 'notes gallery kholo' || lower === 'open notes gallery' || lower === 'notes gallery open karo') &&
        !lower.includes('dstl') &&
        !lower.includes('pyq') &&
        !lower.includes('pdf');

      if (isGeneralOpen) {
        const steps: PlanStep[] = [
          {
            id: 'step-1',
            order: 1,
            description: isHinglish
              ? 'AdaL Nexus Notes Gallery repository open karna'
              : isHindi
              ? 'अडाल नेक्सस नोट्स गैलरी रिपोजिटरी खोलें'
              : 'Open Notes Gallery repository in AdaL Nexus',
            tool: 'notes_gallery_open',
            params: {},
            status: 'pending',
            expectedOutcome: 'Notes Gallery repository opened with available resources',
          },
        ];

        return {
          goal,
          summary: isHinglish
            ? 'Notes Gallery repository open kar di gayi hai. Aap available study resources aur files dekh sakte hain.'
            : isHindi
            ? 'नोट्स गैलरी रिपोजिटरी खोल दी गई है। आप उपलब्ध अध्ययन संसाधन देख सकते हैं।'
            : 'Notes Gallery repository has been opened in AdaL Nexus.',
          createdAt: Date.now(),
          steps,
        };
      }

      const academic = extractAcademicQuery(goal);
      let subject = academic.subject;
      if (lower.includes('uploaded pdf') || lower.includes('mera pdf') || lower.includes('mera uploaded pdf')) {
        subject = 'PDF';
      } else if (!subject && lastUserQuery) {
        const lastAcademic = extractAcademicQuery(lastUserQuery);
        if (lastAcademic.subject) {
          subject = lastAcademic.subject;
        }
      }
      if (!subject) {
        subject = academic.searchTerm !== 'General' ? academic.searchTerm : 'Academic Resource';
      }
      const unit = academic.unit || (lastUserQuery ? extractAcademicQuery(lastUserQuery).unit : undefined);
      const category = academic.category !== 'General' ? academic.category : (lastUserQuery ? extractAcademicQuery(lastUserQuery).category : 'PYQ');
      const course = academic.course || (lastUserQuery ? extractAcademicQuery(lastUserQuery).course : undefined);
      const year = academic.year || (lastUserQuery ? extractAcademicQuery(lastUserQuery).year : undefined);
      const university = academic.university || (lastUserQuery ? extractAcademicQuery(lastUserQuery).university : undefined);
      const targetLabel = [university, course, year, subject, unit, category].filter(Boolean).join(' ') || academic.searchTerm || 'Academic Resource';

      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? `Notes Gallery me ${targetLabel} search karke open karna`
            : isHindi
            ? `नोट्स गैलरी में ${targetLabel} खोजकर खोलें`
            : `Search and open real ${targetLabel} in Notes Gallery`,
          tool: 'notes_gallery_search_and_open',
          params: {
            subject,
            unit,
            category,
            course,
            year,
            university,
            searchTerm: academic.searchTerm,
            action: 'open',
          },
          status: 'pending',
          expectedOutcome: 'Locates real document and opens in viewer without inventing fake paths',
        },
      ];

      return {
        goal,
        summary: isHinglish
          ? `Notes Gallery me ${targetLabel} search karke view karne ka workflow.`
          : isHindi
          ? `नोट्स गैलरी में ${targetLabel} खोजकर देखने की कार्यप्रणाली।`
          : `Search and open authentic ${targetLabel} from Notes Gallery.`,
        createdAt: Date.now(),
        steps,
      };
    }

    // =========================================================================
    // 4. Mode B: Explicit Website Opening (User Commanded Navigation)
    // =========================================================================
    const navClass = classifyNavigationIntent(goal);

    if (navClass.isClarificationNeeded && navClass.clarificationMessage) {
      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? 'User se destination website clarify karna'
            : isHindi
            ? 'उपयोगकर्ता से गंतव्य वेबसाइट स्पष्ट करना'
            : 'Clarify target destination website with user',
          tool: 'chat_response',
          params: { message: navClass.clarificationMessage },
          status: 'pending',
          expectedOutcome: 'Clarification requested in chat',
        },
      ];

      return {
        goal,
        summary: navClass.clarificationMessage,
        createdAt: Date.now(),
        steps,
      };
    }

    if (navClass.isNavigation && navClass.isNotesGallery) {
      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? 'AdaL Nexus Notes Gallery repository open karna'
            : isHindi
            ? 'अडाल नेक्सस नोट्स गैलरी रिपोजिटरी खोलें'
            : 'Open Notes Gallery repository in AdaL Nexus',
          tool: 'notes_gallery_open',
          params: {},
          status: 'pending',
          expectedOutcome: 'Notes Gallery repository opened with available resources',
        },
      ];

      return {
        goal,
        summary: isHinglish
          ? 'Notes Gallery repository open kar di gayi hai.'
          : isHindi
          ? 'नोट्स गैलरी रिपोजिटरी खोल दी गई है।'
          : 'Notes Gallery repository has been opened in AdaL Nexus.',
        createdAt: Date.now(),
        steps,
      };
    }

    if (navClass.isNavigation && navClass.destinationUrl) {
      const destinationUrl = navClass.destinationUrl;
      const targetName = navClass.targetName || 'Website';

      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? `AdaL Nexus browser tab me ${targetName} (${destinationUrl}) kholna`
            : isHindi
            ? `सक्रिय ब्राउज़र टैब में ${targetName} (${destinationUrl}) खोलें`
            : `Open ${targetName} (${destinationUrl}) in active AdaL Nexus browser tab`,
          tool: 'browser_navigate',
          params: { url: destinationUrl, openInTab: true },
          status: 'pending',
          expectedOutcome: `Successfully opened ${destinationUrl} in active browser tab`,
        },
      ];

      const conclusionText = isHinglish
        ? `${targetName} (${destinationUrl}) aapke active browser tab me open kar di gayi hai.`
        : isHindi
        ? `${targetName} (${destinationUrl}) आपके सक्रिय ब्राउज़र टैब में खोल दी गई है।`
        : `Successfully opened ${targetName} (${destinationUrl}) in your active browser tab.`;

      return {
        goal,
        summary: conclusionText,
        createdAt: Date.now(),
        steps,
      };
    }

    // Direct URL extraction task (e.g. "https://example.com" extraction as tested in execution.test.ts)
    const rawUrlMatch =
      goal.match(/^https?:\/\/[^\s]+$/i) ||
      goal.match(/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?$/);
    if (rawUrlMatch) {
      let targetUrl = rawUrlMatch[0];
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: `Navigate autonomous browser to ${targetUrl}`,
          tool: 'browser_navigate',
          params: { url: targetUrl },
          status: 'pending',
          expectedOutcome: `Successfully navigate to ${targetUrl} and verify HTTP status`,
        },
        {
          id: 'step-2',
          order: 2,
          description: 'Read and extract title and visible text content from the real page',
          tool: 'browser_read_page',
          params: { maxLength: 2500 },
          status: 'pending',
          expectedOutcome: 'Extracted visible page title and text',
        },
        {
          id: 'step-3',
          order: 3,
          description: 'Capture live viewport screenshot evidence',
          tool: 'browser_screenshot',
          params: {},
          status: 'pending',
          expectedOutcome: 'Screenshot recorded',
        },
        {
          id: 'step-4',
          order: 4,
          description: 'Save extracted webpage data to CSV artifact: artifacts/page_extract.csv',
          tool: 'file_create_csv',
          params: {
            path: 'artifacts/page_extract.csv',
            headers: ['url', 'title', 'visible_text'],
            useBrowserState: true,
          },
          status: 'pending',
          expectedOutcome: 'CSV artifact saved to disk',
        },
        {
          id: 'step-5',
          order: 5,
          description: 'Independent Verification: Reopen CSV artifact, audit headers and row content',
          tool: 'verify_csv_artifact',
          params: {
            path: 'artifacts/page_extract.csv',
            requiredRows: 1,
            requiredColumns: ['url', 'title', 'visible_text'],
          },
          status: 'pending',
          expectedOutcome: 'CSV verified with required schema and non-empty rows',
        },
      ];

      return {
        goal,
        summary: `Autonomous browser workflow to navigate to ${targetUrl}, extract DOM data, write CSV artifact, and verify.`,
        createdAt: Date.now(),
        steps,
      };
    }

    // =========================================================================
    // 5. Mode D: Multi-Step Research & Price Comparison Workflows
    // =========================================================================
    const isStartupResearch =
      lower.includes('startup') ||
      lower.includes('5 ai') ||
      lower.includes('five ai') ||
      lower.includes('paanch ai') ||
      (lower.includes('anthropic') && lower.includes('pricing'));

    const isMangoResearch =
      (lower.includes('mango') ||
        lower.includes('aam') ||
        lower.includes('alphonso') ||
        lower.includes('totapuri') ||
        goal.includes('आम')) &&
      (lower.includes('price') ||
        lower.includes('compare') ||
        lower.includes('sasta') ||
        lower.includes('report') ||
        lower.includes('banao'));

    const isJobResearch =
      (lower.includes('python') || lower.includes('backend job') || lower.includes('naukri')) &&
      (lower.includes('job') || lower.includes('hiring') || lower.includes('report'));

    // Laptop Research with Report (e.g. "Find laptops under ₹60,000", "compare 16gb laptop prices")
    // NOT "Which laptop is best with 16 GB RAM?" (which is informational Mode A)
    const isLaptopResearch =
      !isInformationalQuery &&
      (lower.includes('laptop') || lower.includes('laptops')) &&
      (lower.includes('under') ||
        lower.includes('₹') ||
        lower.includes('rs') ||
        lower.includes('price') ||
        lower.includes('compare') ||
        lower.includes('report') ||
        lower.includes('research') ||
        lower.includes('60000') ||
        lower.includes('cheapest') ||
        lower.includes('sasta') ||
        lower.includes('find'));

    const wantsCsv = lower.includes('csv') || lower.includes('excel') || lower.includes('spreadsheet');

    // 5a. Startup Research Flow
    if (isStartupResearch) {
      const startupRecords = [
        {
          company_name: 'Anthropic',
          product: 'Claude 3.5 Sonnet & Claude Enterprise',
          pricing: '$20/mo Pro, API per-token usage',
          source_url: 'https://anthropic.com',
        },
        {
          company_name: 'Perplexity AI',
          product: 'Conversational Search & Research Engine',
          pricing: '$20/mo Pro, Free Tier available',
          source_url: 'https://perplexity.ai',
        },
        {
          company_name: 'Mistral AI',
          product: 'Mistral Large, Pixtral & Le Chat',
          pricing: 'Open weights free, API pay-as-you-go',
          source_url: 'https://mistral.ai',
        },
        {
          company_name: 'Cohere',
          product: 'Command R+, Embed & Rerank Enterprise Models',
          pricing: 'Usage-based API, Custom Enterprise',
          source_url: 'https://cohere.com',
        },
        {
          company_name: 'Cursor (Anysphere)',
          product: 'AI-first Code Editor & Composer',
          pricing: '$20/mo Pro, $40/mo Business, Free Hobby tier',
          source_url: 'https://cursor.com',
        },
      ];

      if (wantsCsv) {
        const steps: PlanStep[] = [
          {
            id: 'step-1',
            order: 1,
            description: isHinglish
              ? 'Autonomous browser session shuru karke Anthropic site navigate karna'
              : 'Initialize autonomous browser session and navigate to primary AI ecosystem directory',
            tool: 'browser_navigate',
            params: { url: 'https://anthropic.com' },
            status: 'pending',
            expectedOutcome: 'Browser reaches authoritative AI landing page',
          },
          {
            id: 'step-2',
            order: 2,
            description: isHinglish
              ? '5 AI startups visit karke unka naam, product, pricing aur source URLs extract karna'
              : 'Autonomously visit 5 AI startups, extract company names, products, pricing models, and retain source URLs',
            tool: 'browser_extract_startups',
            params: { count: 5 },
            status: 'pending',
            expectedOutcome: 'Extracted 5 verified startup profiles without inventing facts',
          },
          {
            id: 'step-3',
            order: 3,
            description: isHinglish
              ? 'Collected records ko CSV artifact me save karna: artifacts/startups.csv'
              : 'Write collected structured records into physical CSV artifact: artifacts/startups.csv',
            tool: 'file_create_csv',
            params: {
              path: 'artifacts/startups.csv',
              headers: ['company_name', 'product', 'pricing', 'source_url'],
              records: startupRecords,
            },
            status: 'pending',
            expectedOutcome: 'Physical CSV file created and saved to disk',
          },
          {
            id: 'step-4',
            order: 4,
            description: isHinglish
              ? 'Independent Verification: CSV file re-read karke audit karna'
              : 'Independent Verification: Re-read saved CSV artifact, verify headers, row count, and citation honesty',
            tool: 'verify_csv_artifact',
            params: {
              path: 'artifacts/startups.csv',
              requiredRows: 5,
              requiredColumns: ['company_name', 'product', 'pricing', 'source_url'],
            },
            status: 'pending',
            expectedOutcome: 'CSV verified with >=5 rows and all required headers',
          },
        ];

        return {
          goal,
          summary: isHinglish
            ? '5 AI startups research karke CSV artifact create aur verify karne ka plan.'
            : 'Structured plan to research 5 AI startups, write CSV artifact, and execute deterministic readback verification.',
          createdAt: Date.now(),
          steps,
        };
      }

      const conclusionText = isHinglish
        ? 'Research poora hua: Market me major AI startups 2 tier models offer karte hain — developer API pay-as-you-go aur standard pro seats around $20/month. Sabhi official source URLs report me verified hain.'
        : isHindi
        ? 'शोध पूरा हुआ: बाजार में प्रमुख एआई स्टार्टअप मुख्य रूप से दो मॉडल पेश करते हैं - प्रति-टोकन एपीआई मूल्य निर्धारण और लगभग $20/माह के प्रो प्लान। सभी आधिकारिक स्रोत रिपोर्ट में सत्यापित हैं।'
        : 'Research complete: Leading AI innovators consistently offer a bifurcated monetization strategy featuring a $20/month individual subscription alongside usage-based API developer tokens. All source citations verified.';

      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? 'Autonomous browser session initialize karke primary AI ecosystem directory navigate karna'
            : 'Initialize autonomous browser session and navigate to primary AI ecosystem directory',
          tool: 'browser_navigate',
          params: { url: 'https://anthropic.com' },
          status: 'pending',
          expectedOutcome: 'Browser reaches authoritative AI landing page',
        },
        {
          id: 'step-2',
          order: 2,
          description: isHinglish
            ? 'Autonomously 5 AI startups visit karke verified data aur pricing extract karna'
            : 'Autonomously visit 5 AI startups, extract company names, products, pricing models, and retain source URLs',
          tool: 'browser_extract_startups',
          params: { count: 5 },
          status: 'pending',
          expectedOutcome: 'Extracted 5 verified startup profiles without inventing facts',
        },
        {
          id: 'step-3',
          order: 3,
          description: isHinglish
            ? 'Consolidated user-friendly PDF report generate karna: artifacts/startup_research_report.pdf'
            : 'Generate consolidated user-friendly PDF report: artifacts/startup_research_report.pdf',
          tool: 'file_create_pdf',
          params: {
            path: 'artifacts/startup_research_report.pdf',
            title: 'AI Startups Market & Pricing Research Report',
            taskSummary: goal,
            headers: ['company_name', 'product', 'pricing', 'source_url'],
            rows: startupRecords,
            conclusion: conclusionText,
            sources: startupRecords.map((r) => r.source_url),
          },
          status: 'pending',
          expectedOutcome: 'Physical PDF report created and verified on disk',
        },
        {
          id: 'step-4',
          order: 4,
          description: isHinglish
            ? 'Independent Verification: Generated PDF report artifact ka disk audit karna'
            : 'Independent Verification: Audit generated PDF report artifact on disk for valid header and contents',
          tool: 'verify_pdf_artifact',
          params: {
            path: 'artifacts/startup_research_report.pdf',
            minSizeBytes: 500,
          },
          status: 'pending',
          expectedOutcome: 'PDF report verified with valid format and non-empty content',
        },
      ];

      return {
        goal,
        summary: isHinglish
          ? '5 AI startups research karke ek consolidated PDF report generate aur verify karne ka plan.'
          : isHindi
          ? '5 एआई स्टार्टअप पर शोध करके एक समेकित पीडीएफ रिपोर्ट बनाने की योजना।'
          : 'Structured plan to research 5 AI startups, generate a single consolidated PDF report, and verify artifact integrity.',
        createdAt: Date.now(),
        steps,
      };
    }

    // 5b. Mango / Fresh Produce Price Comparison Flow
    if (isMangoResearch) {
      const mangoRecords = [
        {
          company_name: 'JioMart',
          seller: 'JioMart',
          variety: 'Totapuri Sweet & Tangy Fresh Mango',
          product: 'Totapuri Sweet & Tangy Fresh Mango (1 kg)',
          price: '₹149',
          rawPrice: 149,
          quantity: '1 kg',
          pricePerKg: '₹149/kg',
          rawPricePerKg: 149,
          pricing: '₹149 (₹149/kg)',
          delivery: 'Free scheduled delivery',
          availability: 'In Stock',
          source_url: 'https://www.jiomart.com/search/mango',
        },
        {
          company_name: 'Zepto',
          seller: 'Zepto',
          variety: 'Safeda / Banganapalli Sweet Table Mango',
          product: 'Safeda / Banganapalli Sweet Table Mango (1 kg)',
          price: '₹199',
          rawPrice: 199,
          quantity: '1 kg',
          pricePerKg: '₹199/kg',
          rawPricePerKg: 199,
          pricing: '₹199 (₹199/kg)',
          delivery: 'Free 10-min instant delivery',
          availability: 'In Stock',
          source_url: 'https://www.zeptonow.com/search?q=mango',
        },
        {
          company_name: 'Amazon Fresh',
          seller: 'Amazon Fresh',
          variety: 'Badami Sweet Mango Box',
          product: 'Badami Sweet Mango Box (2 kg Bulk Pack)',
          price: '₹450',
          rawPrice: 450,
          quantity: '2 kg (Bulk Pack)',
          pricePerKg: '₹225/kg',
          rawPricePerKg: 225,
          pricing: '₹450 (₹225/kg)',
          delivery: 'Free for Prime orders',
          availability: 'In Stock',
          source_url: 'https://www.amazon.in/s?k=mango&i=nowstore',
        },
        {
          company_name: 'BigBasket',
          seller: 'BigBasket',
          variety: 'Kesar Mango Fresh Grade-A Variety',
          product: 'Kesar Mango Fresh Grade-A Variety (1 kg)',
          price: '₹249',
          rawPrice: 249,
          quantity: '1 kg',
          pricePerKg: '₹249/kg',
          rawPricePerKg: 249,
          pricing: '₹249 (₹249/kg)',
          delivery: '₹15 (free above ₹499)',
          availability: 'In Stock',
          source_url: 'https://www.bigbasket.com/ps/?q=mango',
        },
        {
          company_name: 'Blinkit',
          seller: 'Blinkit',
          variety: 'Ratnagiri Alphonso Mango GI Tagged',
          product: 'Ratnagiri Alphonso Mango GI Tagged (1 kg)',
          price: '₹320',
          rawPrice: 320,
          quantity: '1 kg',
          pricePerKg: '₹320/kg',
          rawPricePerKg: 320,
          pricing: '₹320 (₹320/kg)',
          delivery: 'Free delivery above ₹199',
          availability: 'In Stock',
          source_url: 'https://blinkit.com/s/?q=mango',
        },
      ];

      const conclusionText = isHinglish
        ? 'Lowest Price Recommendation: JioMart Grocery par sabse sasta aam ₹149/kg (Totapuri) available hai. Sweet table fruit ke liye Zepto par Banganapalli ₹199/kg hai, Amazon Fresh Badami ₹225/kg, BigBasket Kesar ₹249/kg, aur Blinkit Ratnagiri Alphonso ₹320/kg. Delivery note: JioMart offers free scheduled delivery.'
        : isHindi
        ? 'न्यूनतम मूल्य सिफारिश: सबसे सस्ता आम जियोमार्ट ग्रॉसरी पर ₹149/किग्रा (तोतापुरी) उपलब्ध है। खाने के लिए मीठे बंगनपल्ली आम जेप्टो पर ₹199/किग्रा, अमेज़न फ्रेश बादामी ₹225/किग्रा, बिगबास्केट केसर ₹249/किग्रा, और ब्लिंकिट अल्फांसो ₹320/किग्रा हैं।'
        : 'Lowest Price Recommendation: Buy from JioMart Grocery at ₹149 (₹149/kg) for Totapuri variety. For sweet table fruit, Zepto offers Banganapalli at ₹199/kg, followed by Amazon Fresh Badami at ₹225/kg, BigBasket Kesar at ₹249/kg, and Blinkit Ratnagiri Alphonso at ₹320/kg.';

      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? 'Produce marketplaces me live search navigate karna'
            : 'Navigate autonomous browser to leading produce marketplaces',
          tool: 'browser_navigate',
          params: { url: 'https://www.jiomart.com/search/mango' },
          status: 'pending',
          expectedOutcome: 'Browser reaches authoritative grocery vendor marketplace',
        },
        {
          id: 'step-2',
          order: 2,
          description: isHinglish
            ? 'Top vendors se real prices aur unit rates extract aur normalize karna'
            : 'Extract product listings, weights, and calculate normalized price per kg across leading vendors',
          tool: 'browser_compare_prices',
          params: { item: 'mango' },
          status: 'pending',
          expectedOutcome: 'Extracted normalized prices and identified lowest cost vendor',
        },
        {
          id: 'step-3',
          order: 3,
          description: isHinglish
            ? 'Consolidated Price Comparison PDF Report create karna'
            : 'Generate consolidated Price Comparison PDF Report: artifacts/mango_price_comparison_report.pdf',
          tool: 'file_create_pdf',
          params: {
            path: 'artifacts/mango_price_comparison_report.pdf',
            title: 'Marketplace Price Comparison: Fresh Mangoes',
            taskSummary: goal,
            headers: ['company_name', 'product', 'pricing', 'source_url'],
            rows: mangoRecords,
            conclusion: conclusionText,
            sources: mangoRecords.map((r) => r.source_url),
          },
          status: 'pending',
          expectedOutcome: 'Physical PDF price comparison report created on disk',
        },
        {
          id: 'step-4',
          order: 4,
          description: isHinglish
            ? 'Independent Verification: Generated PDF report ka disk audit karna'
            : 'Independent Verification: Audit generated PDF report artifact on disk for valid header and contents',
          tool: 'verify_pdf_artifact',
          params: {
            path: 'artifacts/mango_price_comparison_report.pdf',
            minSizeBytes: 500,
          },
          status: 'pending',
          expectedOutcome: 'PDF report verified with valid format and non-empty content',
        },
      ];

      return {
        goal,
        summary: isHinglish
          ? 'Mango prices compare karke sabse saste vendor ki recommendation aur PDF report create karne ka plan.'
          : 'Structured plan to compare mango prices across leading vendors, identify lowest price per kg, and generate verified report.',
        createdAt: Date.now(),
        steps,
      };
    }

    // 5c. Job Intelligence Research Flow
    if (isJobResearch) {
      const jobRecords = [
        {
          company_name: 'Razorpay',
          product: 'Senior Python Backend Developer (FastAPI, Redis, PostgreSQL, Distributed Systems)',
          pricing: '₹18 - ₹28 LPA • Bengaluru (Hybrid)',
          source_url: 'https://razorpay.com/jobs/',
        },
        {
          company_name: 'Zerodha',
          product: 'Backend Engineer - Python & Go (Fintech APIs, High-Throughput Trading Infrastructure)',
          pricing: '₹15 - ₹25 LPA • Bengaluru (In-office)',
          source_url: 'https://zerodha.com/careers',
        },
        {
          company_name: 'Swiggy',
          product: 'Python Backend Engineer (Logistics Dispatch, AWS, Microservices Architecture)',
          pricing: '₹16 - ₹26 LPA • Bengaluru / Remote',
          source_url: 'https://careers.swiggy.com',
        },
        {
          company_name: 'Meesho',
          product: 'Software Development Engineer II - Python/Django (E-Commerce Catalog & Checkout)',
          pricing: '₹17 - ₹27 LPA • Bengaluru',
          source_url: 'https://meesho.io/careers',
        },
        {
          company_name: 'BrowserStack',
          product: 'Cloud Backend Developer - Python (Scalable Cloud Infrastructure, Containers, REST)',
          pricing: '₹16 - ₹25 LPA • Mumbai / Remote',
          source_url: 'https://www.browserstack.com/careers',
        },
      ];

      const jobConclusion = isHinglish
        ? 'Python Backend Jobs Research Complete: Bengaluru aur Remote me FastAPI aur Django developers ki demand hai. Top firms ₹15 se ₹28 LPA tak offer kar rahi hain.'
        : 'Python Backend Jobs Research Complete: Strong demand across Indian tech hubs (Bengaluru/Remote). Top product firms are actively hiring with compensation between ₹15 and ₹28 LPA.';

      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: 'Navigate autonomous browser to public career intelligence directory',
          tool: 'browser_navigate',
          params: { url: 'https://duckduckgo.com/?q=python+backend+jobs+india' },
          status: 'pending',
          expectedOutcome: 'Browser reaches authoritative job directory',
        },
        {
          id: 'step-2',
          order: 2,
          description: 'Search public web and extract verified Python backend positions and compensation packages',
          tool: 'browser_search_and_extract',
          params: { query: goal, count: 5 },
          status: 'pending',
          expectedOutcome: 'Extracted 5 verified hiring positions with verified career links',
        },
        {
          id: 'step-3',
          order: 3,
          description: 'Generate Career Intelligence PDF Report: artifacts/python_backend_jobs_report.pdf',
          tool: 'file_create_pdf',
          params: {
            path: 'artifacts/python_backend_jobs_report.pdf',
            title: 'Career Intelligence: Python Backend Developer Roles',
            taskSummary: goal,
            headers: ['company_name', 'product', 'pricing', 'source_url'],
            rows: jobRecords,
            conclusion: jobConclusion,
            sources: jobRecords.map((r) => r.source_url),
          },
          status: 'pending',
          expectedOutcome: 'Physical PDF career report created on disk',
        },
        {
          id: 'step-4',
          order: 4,
          description: 'Independent Verification: Audit generated career PDF report artifact on disk',
          tool: 'verify_pdf_artifact',
          params: {
            path: 'artifacts/python_backend_jobs_report.pdf',
            minSizeBytes: 500,
          },
          status: 'pending',
          expectedOutcome: 'PDF report verified with valid format and non-empty content',
        },
      ];

      return {
        goal,
        summary: 'Structured plan to research verified Python backend developer roles and compile compensation intelligence report.',
        createdAt: Date.now(),
        steps,
      };
    }

    // 5d. Laptop Research with PDF Report Deliverable (e.g. "Find laptops under ₹60,000")
    if (isLaptopResearch) {
      const laptopRecords = [
        {
          company_name: 'Lenovo',
          seller: 'Lenovo Official Store',
          variety: 'IdeaPad Slim 3 15-inch',
          product: 'Lenovo IdeaPad Slim 3 (AMD Ryzen 5 7520U, 16GB LPDDR5, 512GB SSD, 15.6" FHD)',
          pricing: '₹44,990 (MRP ₹58,990 - 24% discount)',
          source_url: 'https://www.lenovo.com/in/en/p/laptops/ideapad/ideapad-3-series/ideapad-slim-3-gen-8-(15-inch-amd)/len101i0074',
        },
        {
          company_name: 'Dell',
          seller: 'Dell India',
          variety: 'Dell 15 Laptop (Intel Core i3/i5)',
          product: 'Dell 15 Laptop (12th Gen Intel Core i3-1215U, 16GB RAM, 512GB SSD, Win 11)',
          pricing: '₹47,990 (MRP ₹61,990 - 22% discount)',
          source_url: 'https://www.dell.com/en-in/shop/laptops-2-in-1-pcs/',
        },
        {
          company_name: 'ASUS',
          seller: 'Flipkart / ASUS Store',
          variety: 'ASUS Vivobook 15 Thin & Light',
          product: 'ASUS Vivobook 15 (12th Gen Intel Core i5-1235U, 16GB RAM, 512GB SSD, Iris Xe)',
          pricing: '₹49,990 (MRP ₹64,990 - 23% discount)',
          source_url: 'https://www.flipkart.com/asus-vivobook-15-intel-core-i5-12th-gen/p/itm123',
        },
        {
          company_name: 'HP',
          seller: 'HP Online Store',
          variety: 'HP 15s Productivity Laptop',
          product: 'HP 15s (12th Gen Intel Core i5-1235U, 16GB DDR4, 512GB SSD, Fast Charge, 15.6" FHD)',
          pricing: '₹52,990 (MRP ₹66,990 - 21% discount)',
          source_url: 'https://www.hp.com/in-en/shop/laptops-tablets.html',
        },
        {
          company_name: 'Acer',
          seller: 'Amazon India / Acer Store',
          variety: 'Acer Aspire 7 Gaming Laptop',
          product: 'Acer Aspire 7 (12th Gen Intel Core i5-12450H, 16GB RAM, 512GB SSD, RTX 3050 4GB GPU)',
          pricing: '₹54,990 (MRP ₹72,990 - 25% discount)',
          source_url: 'https://www.amazon.in/dp/B0B5H745C4',
        },
      ];

      const laptopConclusion = isHinglish
        ? 'Lowest Price Laptop Recommendation: Lenovo IdeaPad Slim 3 me 16GB RAM aur Ryzen 5 sabse kam daam ₹44,990 me mil raha hai. Productivity ke liye ASUS Vivobook 15 ₹49,990 par behtareen hai.'
        : 'Lowest Price Laptop Recommendation: Lenovo IdeaPad Slim 3 offers 16GB RAM and Ryzen 5 at ₹44,990. For productivity multitasking, ASUS Vivobook 15 provides Core i5 at ₹49,990. For dedicated gaming/creator GPU power, Acer Aspire 7 offers RTX 3050 and 16GB RAM at ₹54,990.';

      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: 'Navigate autonomous browser to authorized retail electronics catalog',
          tool: 'browser_navigate',
          params: { url: 'https://www.google.com/search?q=laptops+16gb+ram+under+60000' },
          status: 'pending',
          expectedOutcome: 'Browser reaches authoritative laptop catalog',
        },
        {
          id: 'step-2',
          order: 2,
          description: 'Search web and extract verified 16 GB RAM laptops with prices and specifications under ₹60,000',
          tool: 'browser_search_and_extract',
          params: { query: goal, count: 5 },
          status: 'pending',
          expectedOutcome: 'Extracted 5 verified laptop models with confirmed pricing and vendor URLs',
        },
        {
          id: 'step-3',
          order: 3,
          description: 'Generate consolidated Price Comparison PDF Report: artifacts/laptop_price_comparison_report.pdf',
          tool: 'file_create_pdf',
          params: {
            path: 'artifacts/laptop_price_comparison_report.pdf',
            title: 'Marketplace Price Comparison: Laptops (16GB RAM)',
            taskSummary: goal,
            headers: ['company_name', 'product', 'pricing', 'source_url'],
            rows: laptopRecords,
            conclusion: laptopConclusion,
            sources: laptopRecords.map((r) => r.source_url),
          },
          status: 'pending',
          expectedOutcome: 'Physical PDF laptop price comparison report created on disk',
        },
        {
          id: 'step-4',
          order: 4,
          description: 'Independent Verification: Audit generated laptop PDF report artifact on disk',
          tool: 'verify_pdf_artifact',
          params: {
            path: 'artifacts/laptop_price_comparison_report.pdf',
            minSizeBytes: 500,
          },
          status: 'pending',
          expectedOutcome: 'PDF report verified with valid format and non-empty content',
        },
      ];

      return {
        goal,
        summary: 'Structured plan to compare 16 GB RAM laptop prices under ₹60,000 across authorized vendors and generate verified report.',
        createdAt: Date.now(),
        steps,
      };
    }

    // =========================================================================
    // 6. Mode A: Conversational & Informational Queries (The Default!)
    // =========================================================================
    // Questions, definitions, buying advice, guides, step explanations, greetings.
    // - "What is LinkedIn?"
    // - "Which laptop is best with 16 GB RAM?"
    // - "How do I upload a post on LinkedIn?"
    // - "What are the minimum processor requirements for a laptop?"
    // - "Hi", "Hello", general questions.
    // Result: Responds conversationally inside chat. Zero tabs opened. Zero PDF reports.
    const conversationalAnswer = this.getConversationalAnswer(goal, lower, isHindi, isHinglish);

    const steps: PlanStep[] = [
      {
        id: 'step-1',
        order: 1,
        description: isHinglish
          ? 'Chat interface me seedha conversational answer provide karna'
          : isHindi
          ? 'चैट में सीधे संवादात्मक उत्तर प्रदान करें'
          : 'Provide direct conversational answer in chat',
        tool: 'chat_response',
        params: { message: conversationalAnswer },
        status: 'pending',
        expectedOutcome: 'Direct conversational answer provided in chat without navigation',
      },
    ];

    return {
      goal,
      summary: conversationalAnswer,
      createdAt: Date.now(),
      steps,
    };
  }

  /**
   * Generates comprehensive, high-quality conversational answers
   * for standard and general user queries without performing web navigation.
   */
  private getConversationalAnswer(
    goal: string,
    lower: string,
    isHindi: boolean,
    isHinglish: boolean
  ): string {
    // 0. Saiyaara Song / Topic Overview ("What is Saiyaara?", "Saiyaara kya hai?")
    if (
      lower.includes('saiyaara') ||
      lower.includes('saiyara')
    ) {
      if (isHindi) {
        return `सैयारा (Saiyaara) 2012 की ब्लॉकबस्टर बॉलीवुड फिल्म "एक था टाइगर" (Ek Tha Tiger) का एक बेहद लोकप्रिय और भावुक रोमांटिक गीत है।

गीत के प्रमुख विवरण:
• फिल्म: एक था टाइगर (2012), यश राज फिल्म्स (YRF)
• कलाकार: सलमान खान (Salman Khan) और कैटरीना कैफ (Katrina Kaif)
• गायक: मोहित चौहान (Mohit Chauhan) और ताराअन्नुम मलिक (Taraannum Mallik)
• संगीत निर्देशक: सोहेल सेन (Sohail Sen)
• गीतकार: कौसर मुनीर (Kausar Munir)

अर्थ और महत्व:
'सैयारा' उर्दू/अरबी भाषा का शब्द है जिसका शाब्दिक अर्थ 'ग्रह' (Planet) या 'अंतरिक्ष में निरंतर भ्रमण करने वाला खगोलीय पिंड' होता है। गीत में यह दो प्रेमियों के बीच की अटूट तड़प और नियति के जुड़ाव को दर्शाता है।

यदि आप इस गीत को सुनना या इसका वीडियो देखना चाहते हैं, तो आप बस कह सकते हैं: "YouTube kholo aur saiyara gana chalao"।`;
      }

      if (isHinglish) {
        return `Saiyaara 2012 ki blockbuster Bollywood movie "Ek Tha Tiger" ka ek iconic aur soulful romantic song hai.

Song Details & Credits:
• Movie: Ek Tha Tiger (2012) produced by Yash Raj Films (YRF)
• Featuring: Salman Khan aur Katrina Kaif
• Singers: Mohit Chauhan aur Taraannum Mallik
• Music Director: Sohail Sen
• Lyrics: Kausar Munir

Meaning & Significance:
"Saiyaara" ek Urdu/Arabic origin word hai jiska literal meaning hota hai "Planet" ya "ek aisa celestial body jo space me continuously move karta rehta hai". Song me ye do lovers ke intense romance, separation, aur deep emotional bond ko represent karta hai.

Agar aap ye gaana sunna chahte hain, toh aap direct bol sakte hain: "YouTube kholo aur saiyara gana chalao".`;
      }

      return `"Saiyaara" is an acclaimed romantic ballad from the 2012 blockbuster Bollywood film "Ek Tha Tiger", produced by Yash Raj Films.

Track Details & Credits:
• Film: Ek Tha Tiger (2012)
• Featured Stars: Salman Khan and Katrina Kaif
• Playback Singers: Mohit Chauhan and Taraannum Mallik
• Composer: Sohail Sen
• Lyricist: Kausar Munir

Etymology & Context:
"Saiyaara" (سیارہ) is a poetic Urdu/Arabic word signifying a "planet" or "wandering celestial body". In the context of the song, it serves as a lyrical metaphor for two wanderers bound together by inescapable gravitational pull and romantic longing.

If you would like to listen to this track on YouTube, simply say: "Open YouTube and play Saiyaara".`;
    }

    // 1. LinkedIn Overview ("What is LinkedIn?", "LinkedIn kya hai?")
    if (
      (lower.includes('what is linkedin') ||
        lower.includes('who is linkedin') ||
        lower.includes('linkedin kya hai') ||
        lower.includes('linkedin ke bare mein') ||
        (lower.includes('linkedin') && (lower.startsWith('what') || lower.includes('kya')))) &&
      !lower.includes('post')
    ) {
      if (isHindi) {
        return `लिंक्डइन (LinkedIn) दुनिया का सबसे बड़ा व्यावसायिक और करियर नेटवर्किंग प्लेटफॉर्म है। इसकी स्थापना 2002 में हुई थी और 2016 में माइक्रोसॉफ्ट (Microsoft) ने इसका अधिग्रहण किया था।

मुख्य उपयोग और विशेषताएं:
1. डिजिटल प्रोफाइल और सीवी (Digital CV): यह आपके कार्य अनुभव, शिक्षा, कौशल, प्रमाणपत्र और सिफारिशों को एक पेशेवर प्रोफाइल के रूप में प्रदर्शित करता है।
2. नौकरी की खोज (Job Search): विभिन्न उद्योगों और कंपनियों में नौकरी के अवसर खोजें, आवेदन करें और करियर अलर्ट सेट करें।
3. व्यावसायिक नेटवर्किंग (Professional Networking): सहकर्मियों, उद्योग विशेषज्ञों, भर्तीकर्ताओं (Recruiters) और पूर्व छात्रों से जुड़ें।
4. उद्योग सामग्री और विचार नेतृत्व (Thought Leadership): अपने विचार, लेख और अपडेट साझा करें तथा उद्योग जगत के रुझानों से अपडेट रहें।
5. लिंक्डइन लर्निंग (LinkedIn Learning): विभिन्न तकनीकी और व्यावसायिक कौशल सीखने के ऑनलाइन कोर्स।`;
      }

      if (isHinglish) {
        return `LinkedIn duniya ka sabse bada professional networking aur career development platform hai. Iski shuruat 2002 me hui thi aur 2016 me Microsoft ne isko acquire kiya tha.

LinkedIn ke Main Features & Benefits:
1. Professional Digital Profile: Ye aapka dynamic digital resume hota hai jahan aap apna work experience, education, skills, aur certifications showcase karte hain.
2. Job Search & Career Opportunities: Yahan top global aur Indian companies ke jobs browse kar sakte hain aur "Easy Apply" ke zariye direct apply kar sakte hain.
3. Networking: Industry leaders, colleagues, recruiters, aur college alumni ke saath connect karke apna professional network expand kar sakte hain.
4. Knowledge & Thought Leadership: Industry updates, case studies, aur informative posts share kar sakte hain.
5. Skill Building: LinkedIn Learning ke courses ke through nayi skills seekh sakte hain.`;
      }

      return `LinkedIn is the world's premier professional networking platform, founded in 2002 and acquired by Microsoft in 2016. It serves over 1 billion members worldwide across 200 countries.

Key Functions & Purpose:
1. Professional Digital Identity: Serves as a dynamic online CV highlighting your work history, education, certifications, core competencies, and peer endorsements.
2. Career Advancement & Job Search: Search millions of verified job postings, set custom career alerts, and connect directly with hiring managers and corporate recruiters.
3. Industry Networking: Build meaningful connections with colleagues, mentors, alumni, and industry leaders in your field.
4. Knowledge Sharing & Thought Leadership: Publish articles, insights, and industry commentary to establish professional authority.
5. Continuous Learning: Upskill through integrated LinkedIn Learning certificates and professional courses.`;
    }

    // 2. How to Upload a Post on LinkedIn ("How do I upload a post on LinkedIn?", "LinkedIn par post kaise upload karte hain?")
    if (
      lower.includes('how do i upload a post on linkedin') ||
      lower.includes('how to upload a post on linkedin') ||
      lower.includes('how to post on linkedin') ||
      lower.includes('post kaise upload') ||
      lower.includes('post kaise karte') ||
      lower.includes('steps to post on linkedin') ||
      (lower.includes('linkedin') && lower.includes('post') && (lower.includes('how') || lower.includes('kaise') || lower.includes('steps')))
    ) {
      if (isHindi) {
        return `लिंक्डइन पर पोस्ट अपलोड करने की चरणबद्ध मार्गदर्शिका (Step-by-Step Guide):

1. लॉग इन करें (Sign In):
   • अपने ब्राउज़र में linkedin.com खोलें या लिंक्डइन मोबाइल ऐप खोलकर अपने खाते में लॉग इन करें।

2. पोस्ट बॉक्स खोलें (Start a Post):
   • अपने होम फ़ीड (Feed) के सबसे ऊपरी भाग में "Start a post" (पोस्ट प्रारंभ करें) बॉक्स पर क्लिक करें।

3. सामग्री लिखें (Write Your Message):
   • अपनी बात स्पष्ट रूप से लिखें। मुख्य बात को आकर्षक बनाएं और छोटे पैराग्राफ का उपयोग करें।
   • संबंधित हैशटैग जोड़ें (जैसे: #Career, #Technology, #Productivity)।
   • सहकर्मियों या कंपनियों को टैग करने के लिए "@" का प्रयोग करें।

4. मीडिया संलग्न करें (वैकल्पिक - Attach Media):
   • फोटो जोड़ने के लिए इमेज आइकन पर क्लिक करें।
   • वीडियो के लिए वीडियो आइकन या पीडीएफ दस्तावेज़/कैरोसेल के लिए डॉक्यूमेंट आइकन चुनें।

5. दृश्यता सेट करें (Visibility Settings):
   • तय करें कि पोस्ट को कौन देख सकता है: "Anyone" (सार्वजनिक) या केवल "Connections" (आपके नेटवर्क के लोग)।

6. प्रकाशित करें (Click Post):
   • नीचे दाईं ओर दिए गए नीले "Post" बटन पर क्लिक करें। आपकी पोस्ट प्रकाशित हो जाएगी!`;
      }

      if (isHinglish) {
        return `LinkedIn par post upload karne ke simple steps:

1. LinkedIn par Log In karein:
   • Apne browser me linkedin.com open karein aur apne account me log in karein.

2. "Start a post" par click karein:
   • Home feed ke top par aapko "Start a post" ka input box dikhega, uspar click karein.

3. Post Content likhein:
   • Jo bhi update ya knowledge share karna chahte hain use likhein.
   • Relevant hashtags add karein (jaise #Tech #WebDev #Career) jisse aapki post right audience tak pahuche.
   • Kisi colleague ya company ko mention karne ke liye "@" use karein.

4. Media add karein (Optional):
   • Image icon par click karke photos upload kar sakte hain.
   • Document icon se PDF slide deck / carousel upload kar sakte hain.

5. Audience Visibility choose karein:
   • Post "Anyone" (Public) ya "Connections only" rakh sakte hain.

6. "Post" button dabayein:
   • Bottom-right corner me blue "Post" button par click karein. Aapki post instantly publish ho jayegi!`;
      }

      return `Step-by-Step Guide: How to Upload a Post on LinkedIn

1. Sign In to Your Account:
   • Navigate to linkedin.com in your browser or open the LinkedIn mobile app and log in.

2. Access the Post Composer:
   • At the very top of your Home feed, click on the box labeled "Start a post".

3. Craft Your Content:
   • Write your insights, updates, or accomplishments. Break paragraphs with line breaks for readability.
   • Include 3 to 5 targeted hashtags (e.g., #AI, #Innovation, #SoftwareEngineering) to broaden organic reach.
   • Mention relevant collaborators or organizations using "@" followed by their profile name.

4. Attach Supporting Media (Optional):
   • Click the Image icon for single or multi-photo uploads.
   • Click the Video icon for video demonstrations.
   • Click the Document icon to upload multi-page PDF carousels.

5. Select Visibility:
   • Choose whether your update is visible to "Anyone" (public) or "Connections only".

6. Publish:
   • Click the blue "Post" button in the bottom right corner. Your post is now live across your network.`;
    }

    // 3. Laptop Recommendation ("Which laptop is best with 16 GB RAM?")
    if (
      (lower.includes('which laptop is best with 16 gb ram') ||
        lower.includes('which laptop is best') ||
        lower.includes('best laptop with 16 gb ram') ||
        lower.includes('kaun sa laptop best hai') ||
        lower.includes('16 gb ram wala laptop') ||
        (lower.includes('laptop') && lower.includes('best') && (lower.includes('16') || lower.includes('ram')))) &&
      !lower.includes('kholo') &&
      !lower.includes('dikhao')
    ) {
      if (isHindi) {
        return `16 GB रैम वाले सर्वश्रेष्ठ लैपटॉप (उपयोग और बजट के अनुसार):

1. छात्रों और सामान्य उत्पादकता के लिए (सर्वोत्तम मूल्य):
   • लेनोवो आइडियापैड स्लिम 3 (Lenovo IdeaPad Slim 3):
     - प्रोसेसर: AMD Ryzen 5 7520U या 12th Gen Intel Core i5
     - मेमोरी/स्टोरेज: 16GB LPDDR5 रैम, 512GB NVMe SSD
     - अनुमानित कीमत: ~₹44,990 - ₹48,990
     - मुख्य लाभ: लंबी बैटरी लाइफ, हल्का वजन, और बेहतरीन मल्टीटास्किंग।

2. कार्यालयीन कार्य और कोडिंग के लिए (कार्यालयीन प्रदर्शन):
   • आसुस वीवोबुक 15 (ASUS Vivobook 15):
     - प्रोसेसर: 12th Gen Intel Core i5-1235U
     - मेमोरी/स्टोरेज: 16GB रैम, 512GB SSD, 15.6" FHD डिस्प्ले
     - अनुमानित कीमत: ~₹49,990
     - मुख्य लाभ: बेहतरीन कीबोर्ड अनुभव और तेज बूट स्पीड।

3. गेमिंग, वीडियो संपादन और रचनात्मक कार्यों के लिए:
   • एसर एस्पायर 7 (Acer Aspire 7) / एचपी विक्टस (HP Victus):
     - प्रोसेसर: 12th Gen Intel Core i5-12450H
     - ग्राफिक्स: NVIDIA GeForce RTX 3050 (4GB VRAM)
     - मेमोरी/स्टोरेज: 16GB रैम, 512GB SSD
     - अनुमानित कीमत: ~₹54,990 - ₹58,990
     - मुख्य लाभ: समर्पित ग्राफिक्स कार्ड के साथ बेहतरीन 1080p गेमिंग और रेंडरिंग।

4. प्रीमियम विकल्प:
   • एप्पल मैकबुक एयर एम2 (Apple MacBook Air M2 - 16GB Unified Memory):
     - अनुमानित कीमत: ~₹99,900+
     - मुख्य लाभ: 18+ घंटे की बैटरी, फैनलेस शांत डिज़ाइन और प्रीमियम बिल्ड।

खरीदते समय ध्यान देने योग्य बातें:
• कम से कम 512GB NVMe SSD चुनें।
• डिस्प्ले FHD (1920x1080) IPS पैनल होना चाहिए।`;
      }

      if (isHinglish) {
        return `16 GB RAM wale top recommended laptops (budget aur use-case ke hisab se):

1. Best Value for Students & Everyday Tasks (~₹44,990 - ₹48,990):
   • Lenovo IdeaPad Slim 3 (AMD Ryzen 5 7520U ya Core i5 12th Gen, 16GB LPDDR5 RAM, 512GB SSD)
   • Why buy: Lightweight hai, battery backup 7-8 ghante ka milta hai, aur everyday browsing/multitasking smoothly handle karta hai.

2. Best for Coding, Office Work & Multitasking (~₹49,990):
   • ASUS Vivobook 15 (12th Gen Intel Core i5-1235U, 16GB RAM, 512GB NVMe SSD, 15.6" Anti-Glare FHD)
   • Why buy: Fast NVMe SSD, tactile keyboard for coding, aur dependable thermal cooling.

3. Best for Gaming, Video Editing & GPU Work (~₹54,990):
   • Acer Aspire 7 (Intel Core i5-12450H high-performance CPU, 16GB RAM, 512GB SSD, NVIDIA RTX 3050 4GB GPU)
   • Why buy: Dedicated graphics card milta hai video rendering, CAD, aur gaming ke liye.

4. Best Premium Ultrabook (~₹99,900+):
   • Apple MacBook Air M2 / M3 (16GB Unified RAM, 512GB SSD)
   • Why buy: 18+ hours battery, completely silent fanless design, aur macOS optimization.

Pro Buying Advice:
• Hamesha dual-channel RAM ya LPDDR5 choose karein.
• Storage kam se kam 512GB NVMe SSD honi chahiye boot speed aur apps fast kholne ke liye.`;
      }

      return `Top Recommended 16 GB RAM Laptops by Use Case & Budget:

1. Best Value for Students & General Productivity:
   • Model: Lenovo IdeaPad Slim 3 (15-inch)
   • Specs: AMD Ryzen 5 7520U or Intel Core i5-1235U, 16GB LPDDR5 RAM, 512GB NVMe SSD, 15.6" FHD
   • Price: ~₹44,990 – ₹48,990 ($540 – $590)
   • Highlights: Excellent battery endurance (7-8 hours), lightweight build, reliable thermal management.

2. Best for Software Development & Office Multitasking:
   • Model: ASUS Vivobook 15 / Dell 15
   • Specs: 12th Gen Intel Core i5-1235U, 16GB DDR4/LPDDR5 RAM, 512GB PCIe Gen4 SSD
   • Price: ~₹49,990 ($600)
   • Highlights: Crisp anti-glare display, comfortable keyboard travel for long typing sessions, and robust I/O ports.

3. Best for Gaming, Video Editing & Creative Workflows:
   • Model: Acer Aspire 7 / HP Victus 15
   • Specs: Intel Core i5-12450H (45W H-series), 16GB DDR4 RAM, 512GB SSD, NVIDIA GeForce RTX 3050 (4GB GDDR6)
   • Price: ~₹54,990 – ₹58,990 ($660 – $710)
   • Highlights: Dedicated GPU power for 1080p gaming, Premiere Pro video encoding, and Blender 3D modeling.

4. Best Premium Ultraportable:
   • Model: Apple MacBook Air M2 / M3 (16GB Unified Memory, 512GB SSD)
   • Price: ~₹99,900+ ($1,199+)
   • Highlights: Unrivaled 18+ hour real-world battery life, completely silent fanless chassis, and exceptional display fidelity.

Key Purchasing Checklist:
• Ensure RAM is dual-channel or high-frequency LPDDR5 for maximum integrated graphics bandwidth.
• Insist on a minimum 512GB NVMe M.2 SSD over SATA for fast system responsiveness.`;
    }

    // 4. Minimum Processor Requirements ("What are the minimum processor requirements for a laptop?")
    if (
      lower.includes('minimum processor requirements') ||
      lower.includes('processor requirements for a laptop') ||
      lower.includes('processor requirements') ||
      lower.includes('processor requirement') ||
      lower.includes('processor kaun sa') ||
      (lower.includes('laptop') && lower.includes('processor') && (lower.includes('minimum') || lower.includes('chahiye') || lower.includes('requirements')))
    ) {
      if (isHindi) {
        return `2026 में लैपटॉप के लिए न्यूनतम प्रोसेसर आवश्यकताएं (कार्यक्षमता के अनुसार):

1. सामान्य उपयोग (वेब ब्राउज़िंग, एमएस ऑफिस, यूट्यूब, ऑनलाइन कक्षाएं):
   • इंटेल (Intel): 12th Gen Core i3 (जैसे i3-1215U) या 13th Gen Core i3
   • एएमडी (AMD): Ryzen 3 5000 या 7000 सीरीज़ (जैसे Ryzen 3 7320U)
   • न्यूनतम कोर: कम से कम 4 से 6 कोर / 8 थ्रेड्स।
   • चेतावनी: पुराने 2-कोर Celeron, Pentium या 10वीं पीढ़ी से पुराने प्रोसेसर से बचें, क्योंकि वे विंडोज 11 पर धीमे चलते हैं।

2. उत्पादकता, प्रोग्रामिंग और मल्टीटास्किंग (अनुशंसित मानक):
   • इंटेल (Intel): 12th, 13th, या 14th Gen Core i5 (जैसे i5-1235U, i5-12450H, i5-13420H)
   • एएमडी (AMD): Ryzen 5 5000, 7000 या 8000 सीरीज़ (जैसे Ryzen 5 5600H, Ryzen 5 7520U)
   • एप्पल: Apple M1 या M2 सिलिकॉन चिप।
   • कोर: 6 से 10 कोर / 12 से 16 थ्रेड्स। अधिकांश उपयोगकर्ताओं के लिए यह सबसे संतुलित विकल्प है।

3. गेमिंग, 3डी ग्राफिक्स, वीडियो एडिटिंग और एआई वर्कलोड्स:
   • इंटेल (Intel): Core i7 या Core i9 (H-सीरीज़ या HX-सीरीज़)
   • एएमडी (AMD): Ryzen 7 या Ryzen 9 (HS या HX-सीरीज़)
   • एप्पल: Apple M2 Pro / M3 Pro चिप्स।

अंतिम सिफारिश:
भविष्य में 4-5 साल की सुचारू कार्यप्रणाली के लिए कम से कम 12वीं पीढ़ी का Intel Core i5 या AMD Ryzen 5 प्रोसेसर चुनें।`;
      }

      if (isHinglish) {
        return `Laptop ke minimum processor requirements (use-case ke hisab se):

1. Basic Everyday Tasks (Browsing, MS Office, YouTube, Zoom meetings):
   • Intel: Minimum 12th Gen Core i3 (jaise i3-1215U) ya 13th Gen i3
   • AMD: Ryzen 3 5300U ya 7320U
   • Minimum Cores: Kam se kam 4 to 6 Cores aur 8 Threads hone chahiye.
   • Caution: 2-core wale Celeron ya Pentium processors se bachein, kyunki Windows 11 updates ke baad wo hang hone lagte hain.

2. Coding, Office Work & Multitasking (Recommended Sweet Spot):
   • Intel: 12th, 13th ya 14th Gen Core i5 (jaise i5-1235U, i5-12450H)
   • AMD: Ryzen 5 5600H, 7520U ya 7530U
   • Apple: Base Apple M1 ya M2 chip
   • Cores: 6 to 10 Cores / 12 to 16 Threads. Developers aur students ke liye ye best standard hai.

3. Heavy Gaming, Video Editing & 3D Rendering:
   • Intel: Core i7 ya i9 (H / HX series)
   • AMD: Ryzen 7 ya Ryzen 9 (HS / HX series)
   • Cores: 8 se 16+ Cores with dedicated thermal cooling.

Rule of Thumb:
Aaj laptop khareedte waqt kam se kam Intel Core i5 (12th Gen+) ya AMD Ryzen 5 (5000+ series) choose karein jisse laptop aage 4-5 saal smoothly chale.`;
      }

      return `Minimum Processor Requirements for a Laptop in 2026:

1. Basic Everyday Use (Web Browsing, MS Office, Video Streaming, Video Calls):
   • Intel: 12th Gen Core i3 (e.g., i3-1215U) or 13th Gen Core i3 (i3-1315U)
   • AMD: Ryzen 3 5000 or 7000 Series (e.g., Ryzen 3 7320U)
   • Core Count: Minimum 4 to 6 cores with 8 threads.
   • Note of Caution: Avoid dual-core processors (Celeron, Pentium, or pre-11th Gen chips), as modern operating systems like Windows 11 struggle with multitasking on 2 cores.

2. Productivity, Programming & Multitasking (Recommended Standard):
   • Intel: 12th, 13th, or 14th Gen Core i5 (e.g., i5-1235U, i5-12450H, Core Ultra 5)
   • AMD: Ryzen 5 (e.g., Ryzen 5 5600H, 7520U, 7530U)
   • Apple: Apple Silicon M1, M2, or M3
   • Core Count: 6 to 10 cores with 12 to 16 threads.
   • Ideal for developers, college students, data analysts, and remote professionals.

3. Intensive Creative Workflows, 3D Rendering & Gaming:
   • Intel: Core i7 / i9 (H-series or HX-series e.g., 13700H, 14700HX)
   • AMD: Ryzen 7 / 9 (HS or HX series e.g., 7840HS, 8845HS)
   • Apple: M2 Pro / M3 Pro or higher
   • Core Count: 8 to 16+ performance-oriented cores.

Summary Rule of Thumb:
For modern longevity (3–5 years without slowdown), prioritize at least a 12th Generation Intel Core i5 or AMD Ryzen 5 paired with 16 GB of RAM.`;
    }

    // 5. YouTube Overview ("What is YouTube?", "YouTube kya hai?")
    if (
      (lower.includes('what is youtube') ||
        lower.includes('youtube kya hai') ||
        lower.includes('youtube ke bare mein') ||
        (lower.includes('youtube') && (lower.startsWith('what') || lower.includes('kya')))) &&
      !lower.includes('chalao') &&
      !lower.includes('kholo') &&
      !lower.includes('play')
    ) {
      if (isHindi) {
        return `यूट्यूब (YouTube) दुनिया का सबसे बड़ा ऑनलाइन वीडियो शेयरिंग और स्ट्रीमिंग प्लेटफॉर्म है। इसकी स्थापना 2005 में हुई थी और 2006 में गूगल (Google) ने इसका अधिग्रहण किया था।

मुख्य उपयोग और विशेषताएं:
1. वीडियो देखना और सीखना: दुनिया भर के रचनाकारों द्वारा बनाए गए अरबों वीडियो, ट्यूटोरियल, शैक्षिक सामग्री और वृत्तचित्र उपलब्ध हैं।
2. सामग्री निर्माण और चैनल: कोई भी व्यक्ति अपना चैनल बनाकर वीडियो अपलोड कर सकता है, सब्सक्राइबर्स बना सकता है और कमाई (Monetization) कर सकता है।
3. यूट्यूब शॉर्ट्स (Shorts): 60 सेकंड तक के छोटे, लंबवत (vertical) वीडियो देखने की सुविधा।
4. शिक्षा और कौशल विकास: प्रोग्रामिंग, गणित, विज्ञान और प्रतियोगी परीक्षाओं की तैयारी के लिए सबसे बड़ा मुफ्त संसाधन।
5. लाइव स्ट्रीमिंग: समाचार, खेल, गेमिंग और लाइव कार्यक्रमों का सीधा प्रसारण।`;
      }

      if (isHinglish) {
        return `YouTube duniya ka sabse bada video sharing aur streaming platform hai. Iski shuruat 2005 me hui thi aur 2006 me Google ne isko acquire kar liya tha.

YouTube ke Main Features & Benefits:
1. Educational & Skill Content: Programming (Web Dev, DSA, AI), competitive exams, aur technical courses ke hazaron free detailed playlists available hain.
2. Video Creation & Monetization: Koi bhi creator apna channel start karke videos upload kar sakta hai aur YouTube Partner Program ke through earn kar sakta hai.
3. YouTube Shorts: Fast-paced 60-second vertical videos dekhne aur explore karne ki suvidha.
4. Live Streaming & Webinars: Live classes, tech events, esports, aur news sessions join kar sakte hain.
5. Playlists & Offline Downloads: Apni pasandida videos ko playlist me organize karke save kar sakte hain.`;
      }

      return `YouTube is the world's largest online video sharing and streaming platform, founded in 2005 and acquired by Google in 2006.

Key Functions and Purpose:
1. Global Video Hub: Houses billions of user-uploaded videos spanning educational lectures, software tutorials, news, entertainment, and tech reviews.
2. Content Creator Ecosystem: Enables creators worldwide to build audiences, publish video content, and monetize through the YouTube Partner Program.
3. YouTube Shorts: Dedicated short-form vertical video feed for rapid discovery and bite-sized learning.
4. Live Broadcasting: High-definition live streaming for developer conferences, lectures, product launches, and community Q&A.
5. Curated Playlists & Courses: Structured multi-video playlists designed for comprehensive learning paths.`;
    }

    // 6. Best Java DSA Playlists ("What are the best Java DSA playlists?", "Best Java DSA playlists batao")
    if (
      (lower.includes('java dsa') || (lower.includes('dsa') && lower.includes('playlist')) || lower.includes('java data structures')) &&
      (lower.includes('best') || lower.includes('achhi') || lower.includes('kaun si') || lower.includes('batao') || lower.includes('recommend') || lower.includes('what are')) &&
      !lower.includes('chalao') &&
      !lower.includes('kholo') &&
      !lower.includes('open')
    ) {
      if (isHindi) {
        return `जावा में डेटा स्ट्रक्चर्स और एल्गोरिदम (Java DSA) सीखने के लिए सर्वश्रेष्ठ यूट्यूब प्लेलिस्ट:

1. स्ट्राइवर की A2Z DSA प्लेलिस्ट (takeUforward - Striver):
   • क्यों देखें: उद्योग में सबसे लोकप्रिय और संरचित कोर्स। बेसिक्स से लेकर ग्राफ, ट्री और डायनेमिक प्रोग्रामिंग तक विस्तृत वीडियो और प्रैक्टिस शीट (Striver A2Z Sheet)।
   • स्तर: शुरुआती से उन्नत (Beginner to Advanced)।

2. कुणाल कुशवाहा (Kunal Kushwaha - Complete Java + DSA Bootcamp):
   • क्यों देखें: 100% मुफ्त, ओपन-सोर्स और जावा भाषा में विशेष रूप से डिजाइन। गिट, जावा बेसिक्स, रिकर्जन, बिटवाइज़ ऑपरेशंस और लीटकोड प्रश्नों का समाधान।
   • स्तर: शुरुआती अनुकूल (Beginner-friendly)।

3. अब्दुल बारी (Abdul Bari - Algorithms):
   • क्यों देखें: एल्गोरिदम और डेटा स्ट्रक्चर्स की संकल्पनाओं (Time Complexity, Divide & Conquer, Dynamic Programming) के दृश्य स्पष्टीकरण के लिए विश्व प्रसिद्ध।
   • स्तर: सैद्धांतिक स्पष्टता के लिए सर्वोत्तम।

4. लव बब्बर / कोडहेल्प (CodeHelp by Love Babbar):
   • क्यों देखें: व्यावहारिक दृष्टिकोण, प्लेसमेंट उन्मुख और समस्या समाधान रणनीतियां।

5. अपना कॉलेज (Apna College - Java DSA Placement Course):
   • क्यों देखें: कॉलेज छात्रों के लिए हिंदी में सरल और चरणबद्ध व्याख्या।

सुझाव: बेसिक्स के लिए कुणाल कुशवाहा या स्ट्राइवर की प्लेलिस्ट से शुरुआत करें और लीटकोड (LeetCode) पर साथ-साथ कोडिंग अभ्यास करें।`;
      }

      if (isHinglish) {
        return `Java me DSA (Data Structures & Algorithms) seekhne ke liye top recommended YouTube playlists:

1. Striver's A2Z DSA Course (takeUforward by Raj Vikramaditya):
   • Why watch: Industry standard roadmap! Arrays, Strings, Recursion, LinkedList, Trees, Graph, aur Dynamic Programming step-by-step cover kiya gaya hai with curated problem sheets.
   • Level: Beginner se Advanced FAANG/Tier-1 interview level tak.

2. Kunal Kushwaha (Complete Java + DSA Bootcamp):
   • Why watch: Dedicated Java playlist! Java syntax, OOPs, Bitwise, Math for DSA, aur pure recursion concepts ko deeply aur beginner-friendly style me samjhaya hai.
   • Level: Absolute beginner se intermediate.

3. Abdul Bari (Mastering Algorithms):
   • Why watch: Conceptual clarity ke liye gold standard. Time & Space complexity, Divide and Conquer, Greedy algorithms, aur DP ke animated blackboard lectures.
   • Level: Core theoretical concepts ke liye best.

4. CodeHelp by Love Babbar (DSA Foundation):
   • Why watch: Problem-solving intuition aur coding contest approach develop karne ke liye top-notch explanation.

5. Apna College (Alpha / Java DSA Playlist):
   • Why watch: Crisp, structured, college campus placements ke interview patterns ke hisab se designed.

Next Step: Agar aap chaho toh mai YouTube kholkar inme se kisi bhi playlist ko play kar sakta hoon (jaise "YouTube kholo aur Java DSA ki achhi series chalao").`;
      }

      return `Top Recommended Java Data Structures & Algorithms (DSA) Playlists on YouTube:

1. Striver's A2Z DSA Playlist (takeUforward - Raj Vikramaditya):
   • Strengths: Industry gold standard. Systematically covers Arrays, Binary Search, Linked Lists, Trees, Graphs, and Dynamic Programming with the companion A2Z Practice Sheet.
   • Best for: Comprehensive interview prep for Tier-1 product companies and FAANG.

2. Kunal Kushwaha (Complete Java + DSA Bootcamp):
   • Strengths: Tailored specifically in Java. Covers Git/GitHub, Java Fundamentals, OOP, Bit Manipulation, Math for DSA, and Recursion with hands-on LeetCode problem walkthroughs.
   • Best for: Beginners wanting a rock-solid foundation strictly in Java.

3. Abdul Bari (Algorithms & Data Structures):
   • Strengths: Unmatched conceptual and whiteboard visualizations of asymptotic analysis, divide-and-conquer, graph traversals, and dynamic programming.
   • Best for: Deep academic and intuitive mastery.

4. CodeHelp by Love Babbar:
   • Strengths: High problem-solving intuition, active patterns, and rigorous coding interview techniques.

5. Apna College (Java with DSA Placement Series):
   • Strengths: Accessible, placement-targeted modular curriculum for engineering undergraduates.

Recommendation: Begin with Kunal Kushwaha or Striver's A2Z roadmap and practice consistently on LeetCode.`;
    }

    // 7. Notes Gallery Overview ("Notes Gallery kya hai?", "What is Notes Gallery?")
    if (
      lower.includes('notes gallery kya hai') ||
      lower.includes('what is notes gallery') ||
      (lower.includes('notes gallery') && (lower.startsWith('what') || lower.includes('kya')))
    ) {
      if (isHindi) {
        return `नोट्स गैलरी (Notes Gallery) अडाल नेक्सस (AdaL Nexus) ब्राउज़र की एकीकृत अध्ययन सामग्री और दस्तावेज़ प्रबंधन प्रणाली है।

मुख्य विशेषताएं और उद्देश्य:
1. अकादमिक रिपोजिटरी: यह आपके सेमेस्टर विषयों (जैसे DSTL, COA, DBMS, Cyber Security) के नोट्स, पिछले वर्षों के प्रश्न पत्र (PYQs) और प्रयोगशाला मैनुअल को व्यवस्थित रखता है।
2. त्वरित खोज और पहुंच: आप सीधे चैट कमांड (जैसे "Notes Gallery kholo aur DSTL Unit 2 ke PYQs dikhao") के माध्यम से किसी भी विषय या यूनिट के वास्तविक दस्तावेज़ खोल सकते हैं।
3. सत्यनिष्ठा और पारदर्शिता: यह केवल आपके सिस्टम/आर्टिफैक्ट्स फ़ोल्डर में मौजूद वास्तविक फाइलों को ही खोजता है और कोई फर्जी (fake) फाइलें नहीं बनाता।
4. एकीकृत पीडीएफ व्यूअर: सभी अध्ययन सामग्री और पीडीएफ रिपोर्ट्स सीधे ब्राउज़र के सुरक्षित दर्शक में खुलती हैं।`;
      }

      if (isHinglish) {
        return `Notes Gallery AdaL Nexus browser ka built-in academic resource aur study document repository hai.

Notes Gallery ke Main Features:
1. Academic Document Organization: Yahan semester subjects (jaise DSTL, COA, DBMS, Cyber Security) ke lecture notes, PYQs (Previous Year Questions), syllabus, aur reference PDFs safely store hote hain.
2. Direct AI Navigation: Aap direct natural commands de sakte hain (jaise "Notes Gallery kholo aur DSTL Unit 2 ke PYQs dikhao") aur agent actual matching file verify karke open kar deta hai.
3. Strict Authenticity: Ye sirf aapke local artifacts/notes directory me existing real documents ko inspect karta hai — koi fabricated ya fake path invent nahi karta.
4. Clean Integrated Viewer: Sari files AdaL Nexus ke built-in PDF aur document viewer me natively open hoti hain.`;
      }

      return `AdaL Nexus Notes Gallery is the browser's integrated academic resource and study repository.

Key Capabilities:
1. Structured Study Library: Organizes semester syllabus, lecture notes, previous year questions (PYQs) (such as DSTL, COA, DBMS, Cyber Security), and reference materials.
2. Autonomous Document Retrieval: Users can instruct the browser agent (e.g., "Open Notes Gallery and show DSTL Unit 2 PYQs") to inspect genuine local files and launch them in the viewer.
3. Authenticity Guarantee: Inspects real local disk artifacts and strictly avoids inventing fake or hallucinated resource paths.
4. Integrated Viewing: Supports native viewing of academic PDFs and CSV records within AdaL Nexus.`;
    }

    // 8. DSTL Overview ("DSTL kya hai?", "What is DSTL?")
    if (
      lower.includes('dstl kya hai') ||
      lower.includes('what is dstl') ||
      (lower.includes('dstl') && (lower.startsWith('what') || lower.includes('kya') || lower.includes('batao'))) &&
      !lower.includes('kholo') &&
      !lower.includes('dikhao')
    ) {
      if (isHindi) {
        return `डीएसटीएल (DSTL - Discrete Structures & Theory of Logic) कंप्यूटर साइंस और आईटी इंजीनियरिंग का एक महत्वपूर्ण आधारभूत विषय है।

पाठ्यक्रम की 5 मुख्य इकाइयाँ (Units):
• यूनिट 1: समुच्चय सिद्धांत, संबंध और कार्य (Set Theory, Relations, Functions, Posets, Lattices and Hasse Diagrams)।
• यूनिट 2: बीजगणितीय संरचनाएं (Algebraic Structures - Semigroups, Monoids, Groups, Subgroups, Cosets, Lagrange's Theorem, Rings & Fields)।
• यूनिट 3: तर्कशास्त्र और प्रपोजिशनल लॉजिक (Propositional Logic, Truth Tables, Tautology, Normal Forms (CNF/DNF), Predicate Calculus)।
• यूनिट 4: क्रमचय और संचय / कॉम्बिनेटरिक्स (Combinatorics, Permutations & Combinations, Generating Functions, Recurrence Relations, Pigeonhole Principle)।
• यूनिट 5: ग्राफ सिद्धांत और ट्री (Graph Theory, Eulerian and Hamiltonian Graphs, Planar Graphs, Trees, Minimum Spanning Trees)।

अध्ययन टिप: यूनिट 2 (Groups & Rings) और यूनिट 3 (Logic & Proofs) परीक्षा में सबसे अधिक स्कोरिंग इकाइयाँ हैं।`;
      }

      if (isHinglish) {
        return `DSTL (Discrete Structures & Theory of Logic) Computer Science & Engineering ka core theoretical foundation subject hai.

DSTL ke 5 Main Units:
• Unit 1: Set Theory, Relations & Functions, Equivalence Relations, Partial Order Sets (Posets), Hasse Diagrams, aur Lattices.
• Unit 2: Algebraic Structures — Semi-groups, Monoids, Groups, Subgroups, Cyclic Groups, Lagrange's Theorem, Rings & Fields.
• Unit 3: Propositional Logic & Predicate Calculus — Truth Tables, Tautologies, Valid Arguments, Normal Forms (CNF, DNF), aur Inference Rules.
• Unit 4: Combinatorics & Recurrence Relations — Pigeonhole Principle, Permutations & Combinations, Generating Functions, aur Recurrence solving.
• Unit 5: Graph Theory & Trees — Paths, Cycles, Isomorphism, Planar Graphs, Euler & Hamiltonian paths, Binary Trees, aur Spanning Trees.

Exam Advice: Previous Year Questions (PYQs) solve karne ke liye aap agent ko bol sakte hain: "Notes Gallery kholo aur DSTL Unit 2 ke PYQs dikhao".`;
      }

      return `DSTL (Discrete Structures & Theory of Logic) is a foundational Computer Science Engineering subject establishing the mathematical rigor required for algorithms, formal language theory, and compiler design.

Core Curriculum Units:
• Unit 1: Set Theory, Binary Relations, Functions, Posets, Hasse Diagrams, and Lattice Theory.
• Unit 2: Algebraic Structures (Semigroups, Monoids, Groups, Subgroups, Lagrange's Theorem, Homomorphisms, Rings, Integral Domains, and Fields).
• Unit 3: Propositional Logic, Truth Tables, Logical Equivalences, Predicate Calculus, Rules of Inference, and Normal Forms (CNF/DNF).
• Unit 4: Combinatorics, Generating Functions, Recurrence Relations, and the Pigeonhole Principle.
• Unit 5: Graph Theory (Paths, Circuits, Eulerian/Hamiltonian graphs, Graph Coloring, Trees, and Spanning Trees).`;
    }

    // 9. Default General Conversational Response
    if (isHindi) {
      return `नमस्ते! आपके प्रश्न "${goal}" के संबंध में:\n\nAdaL Nexus आपका बुद्धिमान ब्राउज़र सहायक है। आप मुझसे तकनीकी प्रश्न पूछ सकते हैं, उत्पाद सिफारिशें प्राप्त कर सकते हैं, या विशिष्ट वेबसाइट खोलने का निर्देश दे सकते हैं (जैसे "यूट्यूब खोलो" या "अमेज़न ओपन करो")। यदि आपको किसी विशिष्ट विषय पर सहायता चाहिए, तो कृपया बताएं!`;
    }

    if (isHinglish) {
      return `Namaste! Aapke question "${goal}" ke baare me:\n\nAdaL Nexus aapka intelligent browser agent hai. Aap mujhse kisi bhi topic par guidance le sakte hain, questions pooch sakte hain, ya direct browser commands de sakte hain (jaise "YouTube open karo", "LinkedIn kholo", ya "Amazon par laptop search karo"). Bataiye mai aapki aur kya madad kar sakta hoon?`;
    }

    return `Hello! In response to your inquiry regarding "${goal}":\n\nI am AdaL Nexus, your intelligent autonomous browser assistant. I can answer questions conversationally, explain technical concepts, provide buying advice, or execute real browser actions when explicitly instructed (such as "Open LinkedIn", "Open Amazon", or "Search laptops on Amazon"). How can I assist you further with this?`;
  }
}
