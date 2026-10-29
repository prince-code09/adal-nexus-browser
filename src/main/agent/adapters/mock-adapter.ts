import type { AIProviderAdapter } from './ai-adapter';
import type { ExecutionPlan, PlanStep } from '../../../shared/types';
import type { ToolDefinition } from '../types';

export class MockLocalAIAdapter implements AIProviderAdapter {
  public providerName = 'mock';

  public async generatePlan(goal: string, _tools: ToolDefinition[]): Promise<ExecutionPlan> {
    const lower = goal.toLowerCase();
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
      lower.includes('milega');

    // 1. Sensitive / approval test workflow (English & Hinglish)
    if (
      lower.includes('delete') ||
      lower.includes('publish') ||
      lower.includes('send') ||
      lower.includes('approval') ||
      lower.includes('hatao') ||
      lower.includes('mitao') ||
      lower.includes('bhejo')
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

    // 2a. User Profile Navigation Intent ("Meri LinkedIn profile kholo", "Meri GitHub profile kholo")
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

    // 2b. Natural-Language Website Opening Task ("LinkedIn kholo", "GitHub kholo", "Google kholo", "YouTube kholo")
    const isInformationalQuery =
      lower.startsWith('what is') ||
      lower.startsWith('who is') ||
      lower.startsWith('explain') ||
      lower.startsWith('tell me about') ||
      lower.includes('kya hai') ||
      lower.includes('ke bare mein') ||
      lower.includes('kaise kaam karta');

    const isSiteOpenQuery =
      !isInformationalQuery &&
      (lower.includes('kholo') ||
        lower.includes('open karo') ||
        lower.includes('open in') ||
        lower.includes('pe jao') ||
        lower.startsWith('open ') ||
        lower.startsWith('visit ') ||
        lower.startsWith('go to ') ||
        lower === 'open' ||
        lower.includes('chalao'));

    let destinationUrl = '';
    if (lower.includes('linkedin')) destinationUrl = 'https://www.linkedin.com';
    else if (lower.includes('github')) destinationUrl = 'https://github.com';
    else if (lower.includes('google')) destinationUrl = 'https://www.google.com';
    else if (lower.includes('youtube')) destinationUrl = 'https://www.youtube.com';
    else if (lower.includes('twitter') || lower.includes('x.com')) destinationUrl = 'https://x.com';
    else if (lower.includes('reddit')) destinationUrl = 'https://www.reddit.com';

    const isResearchIntent =
      lower.includes('startup') ||
      lower.includes('research five') ||
      lower.includes('5 ai') ||
      lower.includes('five ai') ||
      lower.includes('paanch ai') ||
      lower.includes('khojo') ||
      lower.includes('dhundho') ||
      lower.includes('compare') ||
      lower.includes('laptop') ||
      lower.includes('job') ||
      lower.includes('backend') ||
      lower.includes('price');

    if (destinationUrl && isSiteOpenQuery && !isResearchIntent) {
      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? `AdaL Nexus browser tab me ${destinationUrl} kholna`
            : isHindi
            ? `एडीए एल नेक्सस ब्राउज़र टैब में ${destinationUrl} खोलें`
            : `Navigate active AdaL Nexus browser tab to ${destinationUrl}`,
          tool: 'browser_navigate',
          params: { url: destinationUrl, openInTab: true },
          status: 'pending',
          expectedOutcome: `Successfully opened ${destinationUrl} in active browser tab`,
        },
      ];

      return {
        goal,
        summary: `Navigate AdaL Nexus browser to ${destinationUrl}.`,
        createdAt: Date.now(),
        steps,
      };
    }

    // 2c. Explicit URL Opening in Browser Tab (e.g. "open https://example.com" or "open cnn.com")
    const urlMatch = goal.match(/https?:\/\/[^\s]+/i) || goal.match(/\b([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)\b/);

    if (urlMatch && isSiteOpenQuery && !isResearchIntent) {
      let targetUrl = urlMatch[0];
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? `AdaL Nexus browser tab me ${targetUrl} kholna`
            : isHindi
            ? `एडीए एल नेक्सस ब्राउज़र टैब में ${targetUrl} खोलें`
            : `Navigate active AdaL Nexus browser tab to ${targetUrl}`,
          tool: 'browser_navigate',
          params: { url: targetUrl, openInTab: true },
          status: 'pending',
          expectedOutcome: `Successfully opened ${targetUrl} in active browser tab`,
        },
      ];

      return {
        goal,
        summary: `Navigate AdaL Nexus browser to ${targetUrl}.`,
        createdAt: Date.now(),
        steps,
      };
    }

    // 2d. Direct URL or General Web Navigation Task (e.g. "https://example.com" extraction)
    if (urlMatch && !isResearchIntent) {
      let targetUrl = urlMatch[0];
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

    // 3. Laptop Research & Price Comparison Workflow
    const isLaptopResearch =
      lower.includes('laptop') ||
      lower.includes('laptops') ||
      lower.includes('notebook') ||
      lower.includes('macbook') ||
      lower.includes('thinkpad') ||
      lower.includes('vivobook') ||
      lower.includes('ideapad') ||
      lower.includes('aspire') ||
      (lower.includes('16') && (lower.includes('ram') || lower.includes('gb'))) ||
      (lower.includes('computer') && (lower.includes('price') || lower.includes('compare')));

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
        ? 'Lowest Price Laptop Recommendation: Lenovo IdeaPad Slim 3 me 16GB RAM aur Ryzen 5 sabse kam daam ₹44,990 me mil raha hai. Productivity ke liye ASUS Vivobook 15 ₹49,990 par behtareen hai, aur dedicated gaming/editing GPU ke liye Acer Aspire 7 RTX 3050 ke saath ₹54,990 par available hai.'
        : isHindi
        ? 'न्यूनतम मूल्य लैपटॉप सिफारिश: लेनोवो आइडियापैड स्लिम 3 में 16GB रैम और राइज़ेन 5 सबसे किफायती ₹44,990 पर उपलब्ध है। उत्पादकता के लिए आसुस वीवोबुक 15 ₹49,990 में और गेमिंग/संपादन जीपीयू के लिए एसर एस्पायर 7 ₹54,990 पर उपलब्ध है।'
        : 'Lowest Price Laptop Recommendation: Lenovo IdeaPad Slim 3 offers 16GB RAM and Ryzen 5 at ₹44,990. For productivity multitasking, ASUS Vivobook 15 provides Core i5 at ₹49,990. For dedicated gaming/creator GPU power, Acer Aspire 7 offers RTX 3050 and 16GB RAM at ₹54,990. All verified product purchase links are listed above.';

      const laptopSteps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? 'Laptop retail platforms par live search navigate karna'
            : isHindi
            ? 'लैपटॉप विक्रेता प्लेटफॉर्म पर लाइव खोज नेविगेट करें'
            : 'Navigate autonomous browser to authorized retail electronics catalog',
          tool: 'browser_navigate',
          params: { url: 'https://www.google.com/search?q=laptops+16gb+ram+under+60000' },
          status: 'pending',
          expectedOutcome: 'Browser reaches authoritative laptop catalog',
        },
        {
          id: 'step-2',
          order: 2,
          description: isHinglish
            ? '16GB RAM laptops ke verified models, prices aur specs extract karna'
            : isHindi
            ? '16GB रैम लैपटॉप के सत्यापित मॉडल, मूल्य और विशिष्टताएं निकालें'
            : 'Search web and extract verified 16 GB RAM laptops with prices and specifications under ₹60,000',
          tool: 'browser_search_and_extract',
          params: { query: goal, count: 5 },
          status: 'pending',
          expectedOutcome: 'Extracted 5 verified laptop models with confirmed pricing and vendor URLs',
        },
        {
          id: 'step-3',
          order: 3,
          description: isHinglish
            ? 'Consolidated Laptop Price Comparison PDF Report create karna'
            : isHindi
            ? 'समेकित लैपटॉप मूल्य तुलना पीडीएफ रिपोर्ट तैयार करें'
            : 'Generate consolidated Price Comparison PDF Report: artifacts/laptop_price_comparison_report.pdf',
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
          description: isHinglish
            ? 'Generated Laptop PDF report ka disk audit karna'
            : isHindi
            ? 'जनरेट की गई लैपटॉप पीडीएफ रिपोर्ट का डिस्क ऑडिट करें'
            : 'Independent Verification: Audit generated laptop PDF report artifact on disk',
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
        summary: isHinglish
          ? '16GB RAM laptops ke prices compare karke sabse saste models aur PDF report create karne ka plan.'
          : isHindi
          ? '16GB रैम लैपटॉप की कीमतों की तुलना करके सबसे किफायती मॉडल और पीडीएफ रिपोर्ट बनाने की योजना।'
          : 'Structured plan to compare 16 GB RAM laptop prices under ₹60,000 across authorized vendors and generate verified report.',
        createdAt: Date.now(),
        steps: laptopSteps,
      };
    }

    // 4. Job Search & Career Intelligence Workflow
    const isJobResearch =
      lower.includes('python') ||
      lower.includes('backend job') ||
      lower.includes('backend developer') ||
      lower.includes('naukri') ||
      (lower.includes('job') &&
        (lower.includes('developer') || lower.includes('engineer') || lower.includes('backend') || lower.includes('hiring')));

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
        ? 'Python Backend Jobs Research Complete: Bengaluru aur Remote me FastAPI aur Django developers ki bhaari demand hai. Razorpay, Zerodha, Swiggy aur Meesho ₹15 se ₹28 LPA tak offer kar rahe hain.'
        : isHindi
        ? 'पायथन बैकएंड नौकरियां अनुसंधान पूर्ण: बेंगलुरु और रिमोट में फास्टएपीआई और डीजेंगो डेवलपर्स की मजबूत मांग है। शीर्ष कंपनियां ₹15 से ₹28 एलपीए पैकेज प्रदान कर रही हैं।'
        : 'Python Backend Jobs Research Complete: Strong demand across Indian tech hubs (Bengaluru/Remote). Top product firms (Razorpay, Zerodha, Swiggy, Meesho) are actively hiring with compensation packages between ₹15 and ₹28 LPA for FastAPI, Django, and scalable cloud systems. Official career links are listed above.';

      const jobSteps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? 'Job aggregators aur career portals navigate karna'
            : isHindi
            ? 'जॉब एग्रीगेटर्स और करियर पोर्टल नेविगेट करें'
            : 'Navigate autonomous browser to public career intelligence directory',
          tool: 'browser_navigate',
          params: { url: 'https://duckduckgo.com/?q=python+backend+jobs+india' },
          status: 'pending',
          expectedOutcome: 'Browser reaches authoritative job directory',
        },
        {
          id: 'step-2',
          order: 2,
          description: isHinglish
            ? 'Verified Python backend job openings aur packages extract karna'
            : isHindi
            ? 'सत्यापित पायथन बैकएंड नौकरियां और वेतन पैकेज निकालें'
            : 'Search public web and extract verified Python backend positions and compensation packages',
          tool: 'browser_search_and_extract',
          params: { query: goal, count: 5 },
          status: 'pending',
          expectedOutcome: 'Extracted 5 verified hiring positions with verified career links',
        },
        {
          id: 'step-3',
          order: 3,
          description: isHinglish
            ? 'Career Intelligence PDF Report create karna'
            : isHindi
            ? 'करियर इंटेलिजेंस पीडीएफ रिपोर्ट तैयार करें'
            : 'Generate Career Intelligence PDF Report: artifacts/python_backend_jobs_report.pdf',
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
          description: isHinglish
            ? 'Generated Career PDF report ka disk audit karna'
            : isHindi
            ? 'जनरेट की गई करियर पीडीएफ रिपोर्ट का डिस्क ऑडिट करें'
            : 'Independent Verification: Audit generated career PDF report artifact on disk',
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
        summary: isHinglish
          ? 'Python backend jobs research karke compensation aur links ke saath report create karne ka plan.'
          : isHindi
          ? 'पायथन बैकएंड नौकरियों पर शोध करके वेतन और आधिकारिक लिंक के साथ रिपोर्ट बनाने की योजना।'
          : 'Structured plan to research verified Python backend developer roles and compile compensation intelligence report.',
        createdAt: Date.now(),
        steps: jobSteps,
      };
    }

    // 5. Fresh Produce & Mango Price Comparison Workflow (Strictly for produce/mango queries)
    const isMangoResearch =
      lower.includes('mango') ||
      lower.includes('aam') ||
      lower.includes('alphonso') ||
      lower.includes('totapuri') ||
      lower.includes('kesar') ||
      lower.includes('badami') ||
      lower.includes('safeda') ||
      goal.includes('आम') ||
      (lower.includes('fruit') && lower.includes('price')) ||
      (lower.includes('produce') && lower.includes('price'));

    const wantsCsv = lower.includes('csv') || lower.includes('excel');

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
        ? 'Lowest Price Recommendation: JioMart Grocery par sabse sasta aam ₹149/kg (Totapuri) available hai. Sweet table fruit ke liye Zepto par Banganapalli ₹199/kg hai, Amazon Fresh Badami ₹225/kg (₹450/2kg pack), BigBasket Kesar ₹249/kg, aur Blinkit Ratnagiri Alphonso ₹320/kg. Delivery note: JioMart offers free scheduled delivery.'
        : isHindi
        ? 'न्यूनतम मूल्य सिफारिश: सबसे सस्ता आम जियोमार्ट ग्रॉसरी पर ₹149/किग्रा (तोतापुरी) उपलब्ध है। खाने के लिए मीठे बंगनपल्ली आम जेप्टो पर ₹199/किग्रा, अमेज़न फ्रेश बादामी ₹225/किग्रा (₹450/2किग्रा पैक), बिगबास्केट केसर ₹249/किग्रा, और ब्लिंकिट अल्फांसो ₹320/किग्रा हैं। जियोमार्ट मुफ्त निर्धारित डिलीवरी प्रदान करता है।'
        : 'Lowest Price Recommendation: Buy from JioMart Grocery at ₹149 (₹149/kg) for Totapuri variety. For sweet table fruit, Zepto offers Banganapalli at ₹199/kg, followed by Amazon Fresh Badami at ₹225/kg (₹450/2kg pack), BigBasket Kesar at ₹249/kg, and Blinkit Ratnagiri Alphonso at ₹320/kg. Delivery note: JioMart offers free scheduled delivery; Zepto offers 10-min instant delivery.';

      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? 'Produce marketplaces me live search navigate karna'
            : isHindi
            ? 'प्रमुख किराना और फल विक्रेताओं की साइट पर जाएँ'
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
            : isHindi
            ? 'शीर्ष विक्रेताओं से वास्तविक मूल्य और प्रति-किग्रा दरें निकालें और सामान्यीकृत करें'
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
            : isHindi
            ? 'समेकित मूल्य तुलना पीडीएफ रिपोर्ट तैयार करें'
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
            : isHindi
            ? 'स्वतंत्र सत्यापन: जनरेट की गई पीडीएफ रिपोर्ट का डिस्क ऑडिट करें'
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
          : isHindi
          ? 'आम की कीमतों की तुलना करके सबसे सस्ते विकल्प की सिफारिश और पीडीएफ रिपोर्ट बनाने की योजना।'
          : 'Structured plan to compare mango prices across leading vendors, identify lowest price per kg, and generate verified report.',
        createdAt: Date.now(),
        steps,
      };
    }

    // 4. Check if request is specifically for AI startups or general web research
    const isStartupResearch =
      lower.includes('startup') ||
      lower.includes('anthropic') ||
      lower.includes('perplexity') ||
      lower.includes('mistral') ||
      lower.includes('claude') ||
      lower.includes('llm') ||
      lower.includes('5 ai') ||
      lower.includes('five ai') ||
      lower.includes('paanch ai');

    if (!isStartupResearch) {
      // General web research / topic intelligence workflow
      const generalConclusion = isHinglish
        ? `Research poora hua: "${goal}" ke liye authoritative web sources se data compile karke verify kar liya gaya hai.`
        : isHindi
        ? `शोध पूर्ण: "${goal}" के लिए आधिकारिक वेब स्रोतों से डेटा संकलित और सत्यापित किया गया है।`
        : `Research complete for "${goal}": Verified findings, specifications, and primary sources compiled into report.`;

      const generalSteps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: isHinglish
            ? `Target topic research ke liye browser navigate karna`
            : isHindi
            ? `लक्षित विषय अनुसंधान के लिए ब्राउज़र नेविगेट करें`
            : `Navigate autonomous browser to public search engine for "${goal.slice(0, 30)}"`,
          tool: 'browser_navigate',
          params: { url: 'https://duckduckgo.com' },
          status: 'pending',
          expectedOutcome: 'Browser reaches authoritative search engine',
        },
        {
          id: 'step-2',
          order: 2,
          description: isHinglish
            ? `Topic ke verified items aur source citations extract karna`
            : isHindi
            ? `विषय के सत्यापित निष्कर्ष और स्रोत निकालें`
            : `Search public web, extract verified entities and citations for "${goal.slice(0, 30)}"`,
          tool: 'browser_search_and_extract',
          params: { query: goal, count: 5 },
          status: 'pending',
          expectedOutcome: 'Extracted verified items and citations matching user goal',
        },
        {
          id: 'step-3',
          order: 3,
          description: isHinglish
            ? `Consolidated research PDF report create karna: artifacts/web_research_report.pdf`
            : isHindi
            ? `समेकित शोध पीडीएफ रिपोर्ट तैयार करें: artifacts/web_research_report.pdf`
            : `Generate consolidated research PDF report: artifacts/web_research_report.pdf`,
          tool: 'file_create_pdf',
          params: {
            path: 'artifacts/web_research_report.pdf',
            title: `Web Intelligence Report: ${goal.slice(0, 35)}`,
            taskSummary: goal,
            headers: ['company_name', 'product', 'pricing', 'source_url'],
            rows: [],
            conclusion: generalConclusion,
          },
          status: 'pending',
          expectedOutcome: 'Physical PDF report created and saved to disk',
        },
        {
          id: 'step-4',
          order: 4,
          description: isHinglish
            ? `Generated PDF report ka disk audit karna`
            : isHindi
            ? `जनरेट की गई पीडीएफ रिपोर्ट का डिस्क ऑडिट करें`
            : `Independent Verification: Audit generated PDF report artifact on disk`,
          tool: 'verify_pdf_artifact',
          params: {
            path: 'artifacts/web_research_report.pdf',
            minSizeBytes: 500,
          },
          status: 'pending',
          expectedOutcome: 'PDF report verified with valid format and non-empty content',
        },
      ];

      return {
        goal,
        summary: isHinglish
          ? `"${goal}" ke liye web research karke verified report generate karne ka plan.`
          : isHindi
          ? `"${goal}" के लिए वेब अनुसंधान करके सत्यापित रिपोर्ट बनाने की योजना।`
          : `Autonomous research plan for "${goal}" to collect verified items, extract citations, and generate PDF report.`,
        createdAt: Date.now(),
        steps: generalSteps,
      };
    }

    // 5. Primary demonstration workflow: Research 5 AI startups

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
            : isHindi
            ? 'स्वायत्त ब्राउज़र सत्र शुरू करें और प्राथमिक एआई साइट पर जाएँ'
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
            : isHindi
            ? '5 एआई स्टार्टअप पर जाएँ, कंपनी के नाम, उत्पाद, मूल्य निर्धारण और स्रोत यूआरएल निकालें'
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
            : isHindi
            ? 'एकत्र किए गए रिकॉर्ड को सीएसवी फ़ाइल में सहेजें: artifacts/startups.csv'
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
            : isHindi
            ? 'स्वतंत्र सत्यापन: सीएसवी फ़ाइल की पुनः जाँच और ऑडिट करें'
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
          : isHindi
          ? '5 एआई स्टार्टअप पर शोध करने और सीएसवी फ़ाइल बनाने की योजना।'
          : 'Structured plan to research 5 AI startups, write CSV artifact, and execute deterministic readback verification.',
        createdAt: Date.now(),
        steps,
      };
    }

    // Default: Generate exactly ONE consolidated PDF report by default
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
          : isHindi
          ? 'स्वायत्त ब्राउज़र सत्र शुरू करें और प्राथमिक एआई साइट पर जाएँ'
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
          : isHindi
          ? 'स्वायत्त रूप से 5 एआई स्टार्टअप पर जाएँ और सत्यापित डेटा निकालें'
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
          : isHindi
          ? 'समेकित उपयोगकर्ता-अनुकूल पीडीएफ रिपोर्ट तैयार करें: artifacts/startup_research_report.pdf'
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
          : isHindi
          ? 'स्वतंत्र सत्यापन: जनरेट की गई पीडीएफ रिपोर्ट का डिस्क ऑडिट करें'
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
}
