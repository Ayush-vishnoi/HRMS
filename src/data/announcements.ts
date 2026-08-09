export interface Announcement {
  id: string;
  title: string;
  summary: string;
  department: string;
  publishedAt: string;
  content: string[];
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'independence-day-celebration-2026',
    title: 'Independence Day Celebration 2026',
    summary: 'Flag hoisting, cultural performances, and breakfast begin at 9:00 AM on August 15.',
    department: 'People & Culture',
    publishedAt: 'Today',
    content: [
      'We are pleased to invite everyone to our Independence Day celebration on Friday, August 15, 2026, in the office courtyard.',
      'The flag-hoisting ceremony will begin at 9:00 AM, followed by cultural performances from our colleagues and a community breakfast.',
      'Please arrive by 8:45 AM so that the programme can begin on time. Traditional attire is welcome but entirely optional.',
    ],
  },
  {
    id: 'independence-day-holiday',
    title: 'Upcoming Holiday: Independence Day Weekend',
    summary: 'The office will remain closed on Friday, August 15. Enjoy the long weekend.',
    department: 'Facilities',
    publishedAt: '4 days ago',
    content: [
      'Please note that all company offices will remain closed on Friday, August 15, in observance of Independence Day.',
      'Regular office operations will resume on Monday, August 18. Teams with essential support coverage should follow their agreed roster.',
      'We wish you and your family a safe and relaxing long weekend.',
    ],
  },
  {
    id: 'open-enrollment-reminder',
    title: 'Open Enrollment Reminder',
    summary: 'Review and submit your health insurance selections before August 20.',
    department: 'Benefits Team',
    publishedAt: '1 week ago',
    content: [
      'Open enrollment for this year’s health insurance benefits is now available in the employee portal.',
      'Please review your current coverage, dependent details, and available plan options before submitting your selections.',
      'The enrollment window closes at 5:00 PM on August 20. Contact the Benefits Team if you need help with your submission.',
    ],
  },
  {
    id: 'quarterly-town-hall',
    title: 'Quarterly Town Hall',
    summary: 'Join the leadership team online on August 22 at 4:00 PM for the quarterly business update.',
    department: 'Leadership',
    publishedAt: '1 week ago',
    content: [
      'Our quarterly town hall will be held online on August 22 at 4:00 PM.',
      'The leadership team will share business highlights, team achievements, and priorities for the upcoming quarter.',
      'A calendar invitation with the joining link will be sent to all employees. You may submit questions in advance through the event form.',
    ],
  },
  {
    id: 'new-learning-portal',
    title: 'New Learning Portal Available',
    summary: 'Explore new technical, leadership, and wellbeing courses in the learning portal.',
    department: 'Learning & Development',
    publishedAt: '2 weeks ago',
    content: [
      'The refreshed learning portal is now live with new courses and improved recommendations for every role.',
      'You can explore technical, leadership, communication, and wellbeing learning paths at your own pace.',
      'Please sign in with your employee account to begin. Managers can also use the portal to recommend courses for their teams.',
    ],
  },
  {
    id: 'updated-wfh-guidelines',
    title: 'Updated Work From Home Guidelines',
    summary: 'Please review the revised hybrid work policy before submitting next month’s work-from-home requests.',
    department: 'Human Resources',
    publishedAt: '3 weeks ago',
    content: [
      'The hybrid work policy has been updated to make monthly work-from-home planning clearer for employees and managers.',
      'Please review the revised guidelines before submitting requests for next month. Requests should be submitted in the employee portal before the monthly planning deadline.',
      'For policy questions, contact your HR business partner.',
    ],
  },
  {
    id: 'employee-referral-programme',
    title: 'Employee Referral Programme',
    summary: 'Refer a candidate for an open position and help grow our team. Rewards apply to successful hires.',
    department: 'Talent Acquisition',
    publishedAt: '1 month ago',
    content: [
      'Our employee referral programme is open for all current positions listed on the careers portal.',
      'If you know a strong candidate, share their profile through the referral form and include a short note about why they would be a good fit.',
      'Referral rewards apply when a referred candidate is successfully hired and completes the applicable eligibility period.',
    ],
  },
];

