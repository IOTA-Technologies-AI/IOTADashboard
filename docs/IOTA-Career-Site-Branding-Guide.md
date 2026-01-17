# IOTA Technologies Career Site - Webflow Branding Guide

## Overview

This document outlines the branding requirements for customizing the Webflow career site (https://iota-career-site.webflow.io) to match IOTA Technologies branding standards.

---

## Current State (Template: "Devtask")

The site currently uses the "Devtask" template with placeholder content that needs to be replaced with IOTA branding.

---

## 1. Logo & Brand Identity

### Header Logo

- **Current:** Devtask logo
- **Replace with:** IOTA Technologies logo
- **Logo Files:**
  - Primary: `/logo/logo-single.svg`
  - With text: `/logo/logo-full.svg`
  - Favicon: `/favicon/favicon.ico`

### Color Palette

| Color Name       | Hex Code  | Usage                           |
| ---------------- | --------- | ------------------------------- |
| Primary Blue     | `#1976D2` | Primary buttons, links, accents |
| Secondary Purple | `#7C3AED` | Secondary accents, gradients    |
| Dark Gray        | `#1E293B` | Text, backgrounds               |
| Light Gray       | `#F8FAFC` | Page backgrounds                |
| Success Green    | `#22C55E` | Success states                  |
| White            | `#FFFFFF` | Cards, text on dark             |

### Typography

- **Headings:** Inter (or Public Sans) - Bold/Semi-Bold
- **Body:** Inter (or Public Sans) - Regular
- **Font sizes:**
  - H1: 48px / 3rem
  - H2: 36px / 2.25rem
  - H3: 24px / 1.5rem
  - Body: 16px / 1rem

---

## 2. Header Section

### Current Text to Replace:

- ❌ "The #1 job board for software development"
- ✅ **"Join the IOTA Team"**

### Subheading:

- ❌ "Find your dream job in software development..."
- ✅ **"Build the future of AI-powered enterprise solutions with IOTA Technologies"**

### Navigation Items:

- Home
- About Us (link to main site)
- Open Positions
- Contact

---

## 3. Hero Section

### Main Headline:

```
Shape the Future with IOTA Technologies
```

### Supporting Text:

```
We're building innovative AI solutions for enterprises worldwide.
Join our team of talented engineers, designers, and innovators.
```

### Call-to-Action Button:

- Text: "Explore Opportunities"
- Style: Primary blue background, white text, rounded corners

---

## 4. Company Info Section

### About IOTA Technologies:

```
IOTA Technologies is a leading AI and enterprise solutions company based in Dubai, UAE.
We specialize in developing cutting-edge AI-powered platforms that transform how
businesses operate and make decisions.

Our team of world-class engineers and data scientists work on challenging problems
across artificial intelligence, machine learning, cloud computing, and enterprise
software development.
```

### Company Values:

1. **Innovation First** - We push boundaries and embrace new technologies
2. **Excellence** - We deliver quality in everything we do
3. **Collaboration** - We work together to achieve great things
4. **Integrity** - We do what's right, always

### Perks & Benefits:

- 🏠 Remote-first culture
- 🏥 Comprehensive health insurance
- 📚 Learning & development budget
- 🎯 Performance bonuses
- 🌴 Generous PTO policy
- 💻 Latest tech equipment
- 🍕 Team events & socials
- 🚀 Career growth opportunities

---

## 5. Job Listings Section

### Section Title:

- ❌ "Latest Jobs" or "Open Positions"
- ✅ **"Current Opportunities"**

### Job Card Design:

- Show: Job Title, Department, Location, Job Type
- Include "Remote" badge for remote positions
- "Apply Now" button on each card

### Filters:

- Department (Engineering, Design, Product, etc.)
- Job Type (Full-time, Part-time, Contract)
- Location (Dubai, Remote, Hybrid)

---

## 6. Footer Section

### Current Text to Replace:

- ❌ "© 2024 Devtask"
- ✅ **"© 2026 IOTA Technologies LLC. All rights reserved."**

- ❌ "Made by Riffmax"
- ✅ **Remove entirely** or replace with **"Dubai, UAE"**

### Footer Links:

- Privacy Policy
- Terms of Service
- Careers (current page)
- Contact Us

### Social Media Links:

- LinkedIn: https://www.linkedin.com/company/iota-technologies-ai/
- Twitter/X: (add company handle)
- GitHub: https://github.com/IOTA-Technologies-AI

### Contact Information:

```
IOTA Technologies LLC
Dubai, United Arab Emirates
careers@iotatechnologies.ai
```

---

## 7. Job Application Form

### Required Fields:

- Full Name\*
- Email Address\*
- Phone Number
- LinkedIn Profile URL
- Resume/CV Upload\* (PDF, DOC, DOCX - max 5MB)
- Cover Letter (optional text area)
- Portfolio URL (optional)
- How did you hear about us? (dropdown)

### Submit Button:

- Text: "Submit Application"
- Confirmation message: "Thank you for applying! We'll review your application and get back to you soon."

---

## 8. SEO & Metadata

### Page Title:

```
Careers at IOTA Technologies | Join Our Team
```

### Meta Description:

```
Join IOTA Technologies and help build the future of AI-powered enterprise solutions.
Explore open positions in engineering, design, product, and more.
```

### Open Graph Image:

- Custom image with IOTA logo and "We're Hiring" text
- Size: 1200x630px

---

## 9. Integration Webhook Configuration

### Job Application Webhook URL:

```
https://staging-iotaapiserver-s572.encr.app/webflow/applications/webhook
```

### Webhook Payload Expected:

```json
{
  "jobId": "string",
  "applicantName": "string",
  "applicantEmail": "string",
  "applicantPhone": "string",
  "linkedinUrl": "string",
  "portfolioUrl": "string",
  "coverLetter": "string",
  "resumeUrl": "string",
  "source": "string",
  "submittedAt": "ISO8601 timestamp"
}
```

---

## 10. Implementation Checklist

### Phase 1: Basic Branding

- [ ] Replace header logo with IOTA logo
- [ ] Update color scheme to IOTA colors
- [ ] Replace all placeholder text
- [ ] Update footer copyright and links
- [ ] Add social media links

### Phase 2: Content

- [ ] Write "About Us" content
- [ ] Add company values section
- [ ] Add perks & benefits
- [ ] Create custom hero image/banner

### Phase 3: Integration

- [ ] Configure Webflow form webhook
- [ ] Test job sync from Dashboard
- [ ] Verify application submissions are received
- [ ] Set up email notifications

### Phase 4: Polish

- [ ] Mobile responsiveness check
- [ ] SEO optimization
- [ ] Performance optimization
- [ ] Cross-browser testing

---

## Notes

1. **Webflow Designer Access:** You'll need Editor or Designer access to make these changes in Webflow.

2. **Custom Code:** If needed, add IOTA's Google Analytics or other tracking scripts in Webflow's custom code section.

3. **CMS Collections:** The Jobs collection should have fields that map to our database schema:

   - name (Job Title)
   - slug
   - company-name
   - job-type
   - location
   - remote (boolean)
   - role-description (Rich Text)
   - responsibilities (Rich Text)
   - qualifications (Rich Text)
   - benefits (Rich Text)
   - apply-url

4. **Image Assets:** All images should be optimized for web (WebP format preferred, fallback to PNG/JPG).

---

_Document created: January 17, 2026_
_Version: 1.0_
