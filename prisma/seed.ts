import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../lib/generated/prisma/client';
import { hashPassword } from '../lib/password';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and configure it.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DEMO_PASSWORD = 'demo1234';

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
      passwordHash,
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@example.com' },
    update: {},
    create: {
      email: 'instructor@example.com',
      name: 'Demo Instructor',
      role: 'INSTRUCTOR',
      passwordHash,
    },
  });

  const learner = await prisma.user.upsert({
    where: { email: 'learner@example.com' },
    update: {},
    create: {
      email: 'learner@example.com',
      name: 'Demo Learner',
      role: 'LEARNER',
      passwordHash,
    },
  });

  // A published demo course so the catalog is non-empty out of the box.
  const course = await prisma.course.upsert({
    where: { slug: 'intro-to-typescript' },
    update: {},
    create: {
      slug: 'intro-to-typescript',
      title: 'Intro to TypeScript',
      description: 'A short, friendly introduction to TypeScript basics.',
      instructorId: instructor.id,
      publishedAt: new Date(),
    },
  });

  const lessons = [
    { title: 'Why TypeScript?', content: 'A quick overview of the value proposition.' },
    { title: 'Basic types', content: 'string, number, boolean, arrays, tuples.' },
    { title: 'Functions and inference', content: 'Annotations, return types, generics intro.' },
  ];
  for (let i = 0; i < lessons.length; i++) {
    const order = i + 1;
    const data = lessons[i];
    await prisma.lesson.upsert({
      where: { courseId_order: { courseId: course.id, order } },
      update: {},
      create: {
        courseId: course.id,
        order,
        title: data.title,
        content: data.content,
        contentType: 'TEXT',
        isRequired: true,
      },
    });
  }

  console.log(`✔ admin=${admin.email}`);
  console.log(`✔ instructor=${instructor.email}`);
  console.log(`✔ learner=${learner.email}`);
  console.log(`✔ course=${course.slug} (published, ${lessons.length} lessons)`);
  console.log(`ℹ shared demo password: ${DEMO_PASSWORD}`);
  console.log('✔ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
