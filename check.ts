import { DOMParser } from "jsr:@b-fuze/deno-dom";

interface Watcher {
  type: "content" | "count" | "attribute" | "number";
  id: string;
  name: string;
  url: string;
  selector: string;
  previous?: string | number;
  attribute?: string;
  threshold?: number;
}

const watchersArray: Watcher[] = JSON.parse(await Deno.readTextFile("./watchers.json"));
const watchers = new Map<string, Watcher>(watchersArray.map(e => [e.id, e]));

// いりませんでした
async function hashString(s: string) {
  const hash = await crypto.subtle.digest("SHA-1", (new TextEncoder()).encode(s));
  return Array.from(new Uint8Array(hash)).map(e => e.toString(16).padStart(2, "0")).join("");
}

async function callWebhook(watcher: Watcher, changedValue: any) {
  const webhookUrl = Deno.env.get("WEBHOOK_URL");
  if (!webhookUrl) {
    return;
  }
  await fetch(
    webhookUrl,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        content: `changes detedted on ${watcher.name} ! New value is \`${changedValue}\``
      })
    },
  );
}

for (const [watcherId, watcher] of watchers.entries()) {

  const html = await (await fetch(watcher.url)).text();
  const document = (new DOMParser()).parseFromString(html, "text/html");

  if (watcher.type === "content") {

    const targetElement = document.querySelector(watcher.selector);

    if (!targetElement) {
      continue;
    }

    const content = targetElement.textContent.trim();

    if (!watcher.previous || watcher.previous !== content) {
      watcher.previous = content;
      watchers.set(watcherId, watcher);
      callWebhook(watcher, content);
    }

  }

  if (watcher.type == "count") {

    const targetElementCount = document.querySelectorAll(watcher.selector).length;

    if (watcher.previous === undefined || watcher.previous !== targetElementCount) {
      watcher.previous = targetElementCount;
      watchers.set(watcherId, watcher);
      callWebhook(watcher, targetElementCount);
    }

  }

  if (watcher.type === "attribute") {

    const targetElement = document.querySelector(watcher.selector);

    if (!targetElement || !watcher.attribute || !targetElement.hasAttribute(watcher.attribute)) {
      continue;
    }

    const attributeContent = targetElement.getAttribute(watcher.attribute)!;

    if (!watcher.previous || watcher.previous !== attributeContent) {
      watcher.previous = attributeContent;
      watchers.set(watcherId, watcher);
      callWebhook(watcher, attributeContent);
    }

  }

  if (watcher.type === "number") {

    const targetElement = document.querySelector(watcher.selector);

    if (!targetElement) {
      continue;
    }

    const value = parseFloat(targetElement.textContent.trim().replaceAll(",", ""));

    if (Number.isNaN(value)) {
      continue;
    }

    if (watcher.previous === undefined || typeof watcher.previous === "number" && Math.abs(watcher.previous - value) > (watcher.threshold ?? 0)) {
      watcher.previous = value;
      watchers.set(watcherId, watcher);
      callWebhook(watcher, value);
    }

  }

}

await Deno.writeTextFile("./watchers.json", JSON.stringify([...watchers.values()], null, 2));
