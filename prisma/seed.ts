import "dotenv/config";
import { ownerDb as prisma } from "../lib/db";

const templates = [
  {
    title: "Cold outreach to hiring manager",
    category: "Cold outreach",
    body: `Hi [Contact Name],

I came across the [Role] opening at [Company] and wanted to reach out directly. [Specific Detail] really resonated with me, and it lines up closely with the work I've been doing.

I'd love to learn more about what the team is focused on and share how I could help. Would you be open to a 15-minute chat in the next week or two?

Thanks for your time,
Brigid`,
  },
  {
    title: "Referral request",
    category: "Networking",
    body: `Hi [Contact Name],

I hope you're doing well! I'm applying for the [Role] position at [Company] and noticed you're on the team. [Specific Detail]

Would you be comfortable referring me, or sharing any advice on what the team looks for? Happy to send over my resume and a short blurb to make it easy.

Thank you so much,
Brigid`,
  },
  {
    title: "Follow-up after applying",
    category: "Follow-up",
    body: `Hi [Contact Name],

I recently applied for the [Role] role at [Company] and wanted to follow up to reiterate my interest. [Specific Detail]

If it would be helpful, I'm happy to share more about my background or answer any questions. Looking forward to hearing from you.

Best,
Brigid`,
  },
  {
    title: "Thank you after interview",
    category: "Thank you",
    body: `Hi [Contact Name],

Thank you for taking the time to talk with me about the [Role] position at [Company]. I especially enjoyed our conversation about [Specific Detail].

I'm even more excited about the opportunity after our chat, and I'd welcome the chance to keep the conversation going.

Warmly,
Brigid`,
  },
];

async function main() {
  const count = await prisma.template.count();
  if (count > 0) {
    console.log(`Templates already seeded (${count}), skipping.`);
    return;
  }
  await prisma.template.createMany({ data: templates });
  console.log(`Seeded ${templates.length} templates.`);
}

main().finally(() => prisma.$disconnect());
