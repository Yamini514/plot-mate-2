"use client";

import { NotificationsFeed } from "@/components/NotificationsFeed";

export default function MemberNotificationsPage() {
  return <NotificationsFeed base="/member" subtitle="Updates on your payments, complaints, requests and notices" />;
}
