export const INITIAL_METRICS = {
  totalProspects: 1248,
  activeCampaigns: 4,
  emailsSent: 3842,
  replyRate: 18.4,
  positiveReplies: 68,
  meetingsBooked: 34,
  inboxPlacement: 99.4,
  spamScore: 0.1,
  chartData: [
    { day: 'Mon', sent: 540, opened: 378, replied: 98, meetings: 6 },
    { day: 'Tue', sent: 620, opened: 446, replied: 114, meetings: 8 },
    { day: 'Wed', sent: 710, opened: 512, replied: 132, meetings: 9 },
    { day: 'Thu', sent: 680, opened: 490, replied: 126, meetings: 7 },
    { day: 'Fri', sent: 590, opened: 418, replied: 104, meetings: 4 },
    { day: 'Sat', sent: 320, opened: 210, replied: 48, meetings: 0 },
    { day: 'Sun', sent: 382, opened: 260, replied: 62, meetings: 0 }
  ]
};

export const INITIAL_PROSPECTS = [
  {
    id: 'lead-1',
    name: 'Sarah Jenkins',
    title: 'VP of Growth',
    company: 'Hyperflow AI',
    domain: 'hyperflow.ai',
    industry: 'Enterprise Software / AI',
    headcount: '50-100',
    location: 'San Francisco, CA',
    email: 'sarah@hyperflow.ai',
    phone: '+1 (415) 890-2144',
    linkedin: 'linkedin.com/in/sarah-jenkins-growth',
    status: 'In Sequence',
    fitScore: 98.4,
    seniority: 'Executive',
    techStack: ['Salesforce', 'Hubspot', 'Segment', 'Clearbit', 'Stripe'],
    signals: [
      'Announced $12M Series A funding 2 weeks ago',
      'Currently hiring 4 new outbound SDRs',
      'Spoke on SaaStr podcast about outbound CAC'
    ],
    lastContacted: '2 hours ago',
    campaign: 'US SaaS Series A Founders'
  },
  {
    id: 'lead-2',
    name: 'Marcus Reed',
    title: 'Head of Outbound Sales',
    company: 'Nexar Systems',
    domain: 'nexar.io',
    industry: 'Cloud Infrastructure',
    headcount: '120-250',
    location: 'Austin, TX',
    email: 'm.reed@nexar.io',
    phone: '+1 (512) 640-1980',
    linkedin: 'linkedin.com/in/marcus-reed-nexar',
    status: 'Replied',
    fitScore: 97.6,
    seniority: 'Director',
    techStack: ['Salesforce CRM', 'Apollo.io', 'Gong', 'Outreach'],
    signals: [
      'Transitioned sales stack to Salesforce CRM last month',
      'Expanded headcount by 35% in Q3',
      'Actively seeking email warm-up tools'
    ],
    lastContacted: '1 day ago',
    campaign: 'US SaaS Series A Founders'
  },
  {
    id: 'lead-3',
    name: 'David Vance',
    title: 'VP Revenue Operations',
    company: 'Kinetix Cloud',
    domain: 'kinetix.com',
    industry: 'DevOps & Observability',
    headcount: '250-500',
    location: 'Boston, MA',
    email: 'david@kinetix.com',
    phone: '+1 (617) 420-7711',
    linkedin: 'linkedin.com/in/david-vance-revops',
    status: 'In Sequence',
    fitScore: 96.2,
    seniority: 'Executive',
    techStack: ['HubSpot Enterprise', 'Snowflake', 'Looker', 'Datadog'],
    signals: [
      'Published LinkedIn post on reducing duplicate enrichment',
      'Speaking at RevOps World 2026',
      'Consolidating sales tooling budget'
    ],
    lastContacted: '3 days ago',
    campaign: 'Mid-Market RevOps Leaders'
  },
  {
    id: 'lead-4',
    name: 'Amara Lin',
    title: 'Chief Commercial Officer',
    company: 'Prism Analytics',
    domain: 'prismdata.co',
    industry: 'Data Intelligence',
    headcount: '45-90',
    location: 'London, UK',
    email: 'amara@prismdata.co',
    phone: '+44 20 7946 0912',
    linkedin: 'linkedin.com/in/amara-lin-prism',
    status: 'Meeting Booked',
    fitScore: 99.0,
    seniority: 'Executive',
    techStack: ['HubSpot', 'Mixpanel', 'AWS', 'Zendesk'],
    signals: [
      'Expanding into European enterprise market',
      'Featured in TechCrunch B2B scale-up spotlight',
      'High hiring intent for account executives'
    ],
    lastContacted: 'Today at 10:15 AM',
    campaign: 'EMEA Scaleups Outbound'
  },
  {
    id: 'lead-5',
    name: 'Julian Thorne',
    title: 'Head of Growth Marketing',
    company: 'Synthetix Media',
    domain: 'synthetix.co.uk',
    industry: 'Digital Media & AdTech',
    headcount: '60-120',
    location: 'London, UK',
    email: 'julian@synthetix.co.uk',
    phone: '+44 20 7123 4567',
    linkedin: 'linkedin.com/in/julian-thorne-growth',
    status: 'Researched',
    fitScore: 94.8,
    seniority: 'Director',
    techStack: ['Marketo', 'Google Analytics 4', 'WordPress', 'Segment'],
    signals: [
      'Published study on B2B conversion drop-off',
      'Testing multichannel cold outreach this quarter'
    ],
    lastContacted: 'Never',
    campaign: 'EMEA Scaleups Outbound'
  },
  {
    id: 'lead-6',
    name: 'Kavita Patel',
    title: 'Founder & CEO',
    company: 'Nexus Flow',
    domain: 'nexusflow.com',
    industry: 'Developer Tools',
    headcount: '20-50',
    location: 'San Francisco, CA',
    email: 'kavita@nexusflow.com',
    phone: '+1 (415) 555-0199',
    linkedin: 'linkedin.com/in/kavita-patel-nexus',
    status: 'Researched',
    fitScore: 95.5,
    seniority: 'Executive',
    techStack: ['PostgreSQL', 'Vercel', 'Next.js', 'Stripe'],
    signals: [
      'Launched publicly on Product Hunt (#1 Product of the Day)',
      'Scaling outbound to engineering managers'
    ],
    lastContacted: 'Never',
    campaign: 'AI Infrastructure CTOs'
  },
  {
    id: 'lead-7',
    name: 'Liam O\'Connor',
    title: 'VP of Outbound',
    company: 'Veloce Data',
    domain: 'velocedata.com',
    industry: 'Cybersecurity',
    headcount: '110-250',
    location: 'New York, NY',
    email: 'liam@velocedata.com',
    phone: '+1 (212) 890-4421',
    linkedin: 'linkedin.com/in/liam-oconnor-outbound',
    status: 'In Sequence',
    fitScore: 97.2,
    seniority: 'Executive',
    techStack: ['Salesforce', 'ZoomInfo', 'Gong', 'Slack'],
    signals: [
      'Grew revenue 120% YoY',
      'Targeting enterprise CISOs across North America'
    ],
    lastContacted: '4 days ago',
    campaign: 'US SaaS Series A Founders'
  },
  {
    id: 'lead-8',
    name: 'Chloe Tremblay',
    title: 'Director of Business Development',
    company: 'Aetheria Health',
    domain: 'aetheriahealth.com',
    industry: 'HealthTech & Bio',
    headcount: '80-150',
    location: 'Toronto, Canada',
    email: 'chloe@aetheriahealth.com',
    phone: '+1 (416) 789-0123',
    linkedin: 'linkedin.com/in/chloe-tremblay-bd',
    status: 'Replied',
    fitScore: 93.9,
    seniority: 'Director',
    techStack: ['Hubspot Health', 'Intercom', 'Segment'],
    signals: [
      'Received FDA software clearance',
      'Building North American clinical sales team'
    ],
    lastContacted: 'Yesterday at 4:20 PM',
    campaign: 'US SaaS Series A Founders'
  }
];

export const INITIAL_CAMPAIGNS = [
  {
    id: 'camp-1',
    name: 'US SaaS Series A Founders',
    status: 'Active',
    audience: 'Founders & VP Growth at US SaaS ($5M–$25M raised)',
    prospectsCount: 420,
    emailsSent: 1540,
    openRate: 68.4,
    replyRate: 19.2,
    positiveRate: 64.0,
    meetingsBooked: 16,
    channels: ['Email', 'LinkedIn'],
    createdAt: '2026-10-12',
    schedule: 'Mon–Fri, 9:00 AM – 4:30 PM EST'
  },
  {
    id: 'camp-2',
    name: 'Mid-Market RevOps Leaders',
    status: 'Active',
    audience: 'VP & Director of RevOps (100–500 employees, CRM migration)',
    prospectsCount: 310,
    emailsSent: 1120,
    openRate: 72.1,
    replyRate: 21.5,
    positiveRate: 70.0,
    meetingsBooked: 11,
    channels: ['Email', 'LinkedIn'],
    createdAt: '2026-10-24',
    schedule: 'Mon–Thu, 10:00 AM – 3:00 PM EST'
  },
  {
    id: 'camp-3',
    name: 'EMEA Scaleups Outbound',
    status: 'Active',
    audience: 'Commercial leaders at UK & EU B2B software companies',
    prospectsCount: 290,
    emailsSent: 860,
    openRate: 64.8,
    replyRate: 16.8,
    positiveRate: 58.0,
    meetingsBooked: 7,
    channels: ['Email', 'LinkedIn'],
    createdAt: '2026-11-04',
    schedule: 'Mon–Fri, 9:00 AM – 5:00 PM GMT'
  },
  {
    id: 'camp-4',
    name: 'AI Infrastructure CTOs',
    status: 'Draft',
    audience: 'Technical co-founders & engineering leaders at AI startups',
    prospectsCount: 228,
    emailsSent: 0,
    openRate: 0,
    replyRate: 0,
    positiveRate: 0,
    meetingsBooked: 0,
    channels: ['Email', 'LinkedIn'],
    createdAt: '2026-11-18',
    schedule: 'Drafting message angles'
  }
];

export const INITIAL_LINKEDIN_TASKS = [
  {
    id: 'task-1',
    leadId: 'lead-1',
    leadName: 'Sarah Jenkins',
    leadTitle: 'VP of Growth @ Hyperflow AI',
    leadLinkedin: 'https://linkedin.com/in/sarah-jenkins-growth',
    avatar: 'SJ',
    taskType: 'Connection Request + Note',
    scheduledFor: 'Today, 2:30 PM',
    status: 'Pending',
    draft: 'Hi Sarah — loved your recent post on scaling outbound post-Series A without burning domain rep. We built an AI workflow that researches prospect tech stacks before generating hyper-tailored 1st lines. Thought it might free up your team’s hours this month. Open to connecting?',
    characterCount: 274
  },
  {
    id: 'task-2',
    leadId: 'lead-3',
    leadName: 'David Vance',
    leadTitle: 'VP Revenue Operations @ Kinetix Cloud',
    leadLinkedin: 'https://linkedin.com/in/david-vance-revops',
    avatar: 'DV',
    taskType: 'InMail / Direct Message',
    scheduledFor: 'Today, 4:15 PM',
    status: 'Pending',
    draft: 'Hi David, saw Kinetix transitioned sales infrastructure to Salesforce CRM. Often during a migration, outbound enrichment gets fragmented. Explee integrates directly with your CRM to verify deliverability so reps only touch verified records. Would it make sense to share a quick benchmark report?',
    characterCount: 291
  },
  {
    id: 'task-3',
    leadId: 'lead-5',
    leadName: 'Julian Thorne',
    leadTitle: 'Head of Growth @ Synthetix Media',
    leadLinkedin: 'https://linkedin.com/in/julian-thorne-growth',
    avatar: 'JT',
    taskType: 'Connection Request + Note',
    scheduledFor: 'Tomorrow, 10:00 AM',
    status: 'Pending',
    draft: 'Hi Julian — saw your benchmark teardown on B2B conversion drop-offs on LinkedIn. Really sharp observations on reply fatigue. Our platform automates company research to personalize outreach at scale without hiring an army of reps. Would love to connect!',
    characterCount: 254
  },
  {
    id: 'task-4',
    leadId: 'lead-2',
    leadName: 'Marcus Reed',
    leadTitle: 'Head of Outbound @ Nexar Systems',
    leadLinkedin: 'https://linkedin.com/in/marcus-reed-nexar',
    avatar: 'MR',
    taskType: 'Profile Touch & Engagement',
    scheduledFor: 'Completed yesterday',
    status: 'Completed',
    draft: 'Connected on LinkedIn following their email reply.',
    characterCount: 48
  }
];

export const INITIAL_CONVERSATIONS = [
  {
    id: 'conv-1',
    leadId: 'lead-2',
    leadName: 'Marcus Reed',
    leadRole: 'Head of Outbound @ Nexar Systems',
    leadEmail: 'm.reed@nexar.io',
    avatar: 'MR',
    status: 'High Intent',
    unread: true,
    subject: 'Re: Quick observation on Nexar\'s outbound pod',
    lastMessageTime: '18 mins ago',
    snippet: 'Hey team, this arrived right as we were evaluating outbound tooling for our new reps. Do you have 15 mins this Thursday?',
    history: [
      {
        sender: 'You (Explee Workspace)',
        time: 'Yesterday, 9:15 AM',
        text: 'Hi Marcus, noticed Nexar is expanding the sales team with 3 new SDRs this month. Most outbound leaders we chat with say new reps burn 15+ hours each week manually researching buyer tech stacks. We built Explee to automate that pre-call research while leaving your team with 1-click human approval before anything sends. Open to a quick 5-min look at our benchmark reply rates?'
      },
      {
        sender: 'Marcus Reed',
        time: 'Today, 11:42 AM',
        text: 'Hey team, this arrived right as we were evaluating outbound tooling for our new reps. Your note actually hit on our exact bottleneck with research. Do you have 15 minutes this Thursday afternoon to show us how the human-in-the-loop review queue works?'
      }
    ],
    suggestedReply: 'Hi Marcus, Thursday afternoon works great for us! How does 2:30 PM EST look? I will send over a calendar invite with a Google Meet link.'
  },
  {
    id: 'conv-2',
    leadId: 'lead-4',
    leadName: 'Amara Lin',
    leadRole: 'Chief Commercial Officer @ Prism Analytics',
    leadEmail: 'amara@prismdata.co',
    avatar: 'AL',
    status: 'Meeting Booked',
    unread: false,
    subject: 'Re: Loved your keynote on mid-market outbound economics',
    lastMessageTime: '3 hours ago',
    snippet: 'Accepted the invite for Friday 10 AM GMT. Excited to see the European B2B data coverage.',
    history: [
      {
        sender: 'You (Explee Workspace)',
        time: 'Nov 24, 10:00 AM',
        text: 'Hi Amara, loved your keynote at SaaStr on lowering CAC through personalized sales touchpoints. We built an AI workspace specifically for sales leaders looking to scale personalized outreach in EMEA without hiring an army of SDRs. Thought this would resonate with Prism\'s European growth goals.'
      },
      {
        sender: 'Amara Lin',
        time: 'Nov 25, 2:15 PM',
        text: 'Thanks for reaching out! We are currently looking for GDPR-compliant European company data for our outbound reps. Could you demo your EU data coverage?'
      },
      {
        sender: 'You (Explee Workspace)',
        time: 'Nov 25, 4:00 PM',
        text: 'Absolutely Amara. Sent an invite for Friday 10:00 AM GMT to demo our European database and automated MX verification.'
      },
      {
        sender: 'Amara Lin',
        time: 'Today, 9:20 AM',
        text: 'Accepted the invite for Friday 10 AM GMT. Looking forward to speaking.'
      }
    ],
    suggestedReply: 'Looking forward to meeting Friday at 10 AM GMT Amara!'
  },
  {
    id: 'conv-3',
    leadId: 'lead-8',
    leadName: 'Chloe Tremblay',
    leadRole: 'Director of Business Development @ Aetheria Health',
    leadEmail: 'chloe@aetheriahealth.com',
    avatar: 'CT',
    status: 'Follow Up in Q1',
    unread: false,
    subject: 'Re: HealthTech outbound strategy for clinical directors',
    lastMessageTime: 'Yesterday',
    snippet: 'We just locked our Q4 vendor budget, but please ping me again in mid-January.',
    history: [
      {
        sender: 'You (Explee Workspace)',
        time: 'Nov 22, 11:30 AM',
        text: 'Hi Chloe, saw Aetheria Health received FDA software clearance. Many clinical sales teams struggle with reaching medical directors without generic spam complaints. Explee helps target qualified hospital networks with verified physician emails.'
      },
      {
        sender: 'Chloe Tremblay',
        time: 'Yesterday, 4:20 PM',
        text: 'Hello! Appreciate the relevant note. We just locked our Q4 vendor budget, but please ping me again in mid-January when our new procurement cycle opens.'
      }
    ],
    suggestedReply: 'Understood Chloe, and congratulations again on the FDA clearance! I will set a reminder to reconnect in mid-January. Have a great rest of Q4.'
  }
];

export const INITIAL_SEQUENCES = [
  {
    id: 'seq-1',
    name: 'SaaS Founder 4-Touch Multichannel Sequence',
    campaign: 'US SaaS Series A Founders',
    steps: [
      {
        step: 1,
        day: 1,
        channel: 'Email',
        title: 'Initial Research Trigger Pitch',
        description: 'Bespoke opening line based on company funding, hiring signals, and tech stack.',
        openRate: '68.4%',
        replyRate: '11.2%'
      },
      {
        step: 2,
        day: 3,
        channel: 'LinkedIn',
        title: 'LinkedIn Connection Note',
        description: 'Soft social touchpoint mentioning the email topic and shared professional network.',
        openRate: '42.8%',
        replyRate: '14.5%'
      },
      {
        step: 3,
        day: 6,
        channel: 'Email',
        title: 'Value-Add Follow-up',
        description: 'Shares an anonymized case study or industry benchmark metrics.',
        openRate: '56.1%',
        replyRate: '7.8%'
      },
      {
        step: 4,
        day: 10,
        channel: 'LinkedIn',
        title: 'InMail / Direct Message Touch',
        description: 'Final soft check-in before moving lead to a long-term nurture cadence.',
        openRate: '38.0%',
        replyRate: '4.2%'
      }
    ]
  }
];
