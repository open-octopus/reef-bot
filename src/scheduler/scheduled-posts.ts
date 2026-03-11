import type { Client } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { createConsola } from "consola";
import type { Config } from "../config.js";
import type { Scheduler } from "./scheduler.js";
import { sendToChannel } from "../discord/send-to-channel.js";

const log = createConsola({ defaults: { tag: "scheduled-posts" } });

const REALMS = [
  { name: "Pet", emoji: "\u{1F43E}", description: "Care for your beloved companions and manage their well-being." },
  { name: "Finance", emoji: "\u{1F4B0}", description: "Track your finances, budget wisely, and plan for the future." },
  { name: "Health", emoji: "\u{1F3E5}", description: "Monitor your health goals and stay on top of wellness." },
  { name: "Fitness", emoji: "\u{1F3CB}\uFE0F", description: "Push your limits with workouts, routines, and progress tracking." },
  { name: "Hobby", emoji: "\u{1F3A8}", description: "Explore creative pursuits and passion projects." },
  { name: "Home", emoji: "\u{1F3E0}", description: "Manage your living space, chores, and home improvements." },
  { name: "Work", emoji: "\u{1F4BC}", description: "Stay productive, organize tasks, and advance your career." },
  { name: "Friends", emoji: "\u{1F91D}", description: "Nurture friendships and keep up with your social circle." },
  { name: "Partner", emoji: "\u{2764}\uFE0F", description: "Strengthen your relationship and plan meaningful moments together." },
  { name: "Parents", emoji: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}", description: "Stay connected with family and show appreciation." },
  { name: "Vehicle", emoji: "\u{1F697}", description: "Keep your ride in top shape with maintenance and trip planning." },
  { name: "Legal", emoji: "\u{2696}\uFE0F", description: "Stay on top of important documents, deadlines, and obligations." },
] as const;

/**
 * Register weekly and monthly scheduled posts with the scheduler.
 */
export function registerScheduledPosts(scheduler: Scheduler, client: Client, config: Config): void {
  const channelId = config.announcementChannelId;

  if (!channelId) {
    log.info("No announcement channel configured — skipping scheduled posts");
    return;
  }

  scheduler.register("Realm of the Week", "weekly", async () => {
    const realm = REALMS[Math.floor(Math.random() * REALMS.length)];

    const embed = new EmbedBuilder()
      .setTitle(`${realm.emoji} Realm of the Week: ${realm.name}`)
      .setDescription(
        `This week's featured realm is **${realm.name}**!\n\n` +
        `${realm.description}\n\n` +
        "Try exploring this realm with your summons and see how they can help you level up in this area of your life.",
      )
      .setColor(0x7289da)
      .setTimestamp();

    await sendToChannel(client, channelId, embed);
    log.info(`Posted Realm of the Week: ${realm.name}`);
  });

  scheduler.register("Summon of the Month", "monthly", async () => {
    const embed = new EmbedBuilder()
      .setTitle("\u{1F419} Summon of the Month: Octo")
      .setDescription(
        "This month's featured summon is **Octo** — your trusty octopus companion!\n\n" +
        "Octo is always ready to lend a tentacle. Whether you need help navigating The Reef, " +
        "managing your realms, or just want someone to chat with, Octo has you covered.\n\n" +
        "Try mentioning Octo in any channel to get started!",
      )
      .setColor(0xe67e22)
      .addFields(
        { name: "Specialty", value: "General assistance & navigation", inline: true },
        { name: "Availability", value: "24/7", inline: true },
      )
      .setTimestamp();

    await sendToChannel(client, channelId, embed);
    log.info("Posted Summon of the Month");
  });
}
