import { useEffect, useState } from "react";
import { Smile, Cat, Pizza, Plane, Lightbulb, Hash, Flag, Activity, X, Sparkles, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const CATEGORIES: { id: string; icon: any; emojis: string[] }[] = [
  {
    id: "Smileys & People",
    icon: Smile,
    emojis: "😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👻 👽 👾 🤖 😺 😸 😹 😻 😼 😽 🙀 😿 😾 👋 🤚 🖐 ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏".split(" "),
  },
  {
    id: "Animals & Nature",
    icon: Cat,
    emojis: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪲 🦗 🕷 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🦮 🐕‍🦺 🐈 🐈‍⬛ 🪶 🐓 🦃 🦤 🦚 🦜 🦢 🦩 🕊 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐀 🐿 🦔 🌵 🎄 🌲 🌳 🌴 🌱 🌿 ☘️ 🍀 🎍 🎋 🍃 🍂 🍁 🌾 🌺 🌻 🌹 🥀 🌷 🌼 🌸 💐 🍄 🐚 🌎 🌍 🌏 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌙 ☀️ 🌤 ⛅️ 🌦 🌧 ⛈ 🌩 🌨 ❄️ ☃️ ⛄️ 🌬 💨 🌪 🌫 🌈 ☔️ 💧 💦 🌊".split(" "),
  },
  {
    id: "Food & Drink",
    icon: Pizza,
    emojis: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🦴 🌭 🍔 🍟 🍕 🥪 🥙 🧆 🌮 🌯 🫔 🥗 🥘 🫕 🥫 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🍼 🫖 ☕️ 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🍾 🧊 🥄 🍴 🍽 🥣 🥡 🥢".split(" "),
  },
  {
    id: "Activities",
    icon: Activity,
    emojis: "⚽️ 🏀 🏈 ⚾️ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳️ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸ 🥌 🎿 ⛷ 🏂 🪂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖 🏵 🎗 🎫 🎟 🎪 🤹 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🪘 🎷 🎺 🪗 🎸 🪕 🎻 🎲 ♟ 🎯 🎳 🎮 🎰 🧩".split(" "),
  },
  {
    id: "Travel & Places",
    icon: Plane,
    emojis: "🚗 🚕 🚙 🚌 🚎 🏎 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🦯 🦽 🦼 🛴 🚲 🛵 🏍 🛺 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩 💺 🛰 🚀 🛸 🚁 🛶 ⛵️ 🚤 🛥 🛳 ⛴ 🚢 ⚓️ 🪝 ⛽️ 🚧 🚦 🚥 🗺 🗿 🗽 🗼 🏰 🏯 🏟 🎡 🎢 🎠 ⛲️ ⛱ 🏖 🏝 🏜 🌋 ⛰ 🏔 🗻 🏕 ⛺️ 🛖 🏠 🏡 🏘 🏚 🏗 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛 ⛪️ 🕌 🕍 🛕 🕋".split(" "),
  },
  {
    id: "Objects",
    icon: Lightbulb,
    emojis: "⌚️ 📱 📲 💻 ⌨️ 🖥 🖨 🖱 🖲 🕹 🗜 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽 🎞 📞 ☎️ 📟 📠 📺 📻 🎙 🎚 🎛 🧭 ⏱ ⏲ ⏰ 🕰 ⌛️ ⏳ 📡 🔋 🔌 💡 🔦 🕯 🪔 🧯 🛢 💸 💵 💴 💶 💷 🪙 💰 💳 💎 ⚖️ 🪜 🧰 🪛 🔧 🔨 ⚒ 🛠 ⛏ 🪚 🔩 ⚙️ 🪤 🧱 ⛓ 🧲 🔫 💣 🧨 🪓 🔪 🗡 ⚔️ 🛡 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 💈 🔭 🔬 🕳 🩹 🩺 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡 🧹 🪠 🧺 🧻 🚽 🚰 🚿 🛁 🛀 🧼 🪥 🪒 🧽 🪣 🧴 🛎 🔑 🗝 🚪 🪑 🛋 🛏 🛌 🧸 🪆 🖼 🪞 🪟 🛍 🛒 🎁 🎈 🎏 🎀 🪄 🪅 🎊 🎉 🎎 🏮 🎐 🧧 ✉️ 📩 📨 📧 💌 📥 📤 📦 🏷 🪧 📪 📫 📬 📭 📮 📯 📜 📃 📄 📑 🧾 📊 📈 📉 🗒 🗓 📆 📅 🗑 📇 🗃 🗳 🗄 📋 📁 📂 🗂 🗞 📰 📓 📔 📒 📕 📗 📘 📙 📚 📖 🔖 🧷 🔗 📎 🖇 📐 📏 🧮 📌 📍 ✂️ 🖊 🖋 ✒️ 🖌 🖍 📝 ✏️ 🔍 🔎 🔏 🔐 🔒 🔓".split(" "),
  },
  {
    id: "Symbols",
    icon: Hash,
    emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉 ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈️ ♉️ ♊️ ♋️ ♌️ ♍️ ♎️ ♏️ ♐️ ♑️ ♒️ ♓️ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚️ 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕️ 🛑 ⛔️ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗️ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯️ 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿️ 🅿️ 🛗 🈳 🈂️ 🛂 🛃 🛄 🛅 🚹 🚺 🚼 ⚧ 🚻 🚮 🎦 📶 🈁 🔣 ℹ️ 🔤 🔡 🔠 🆖 🆗 🆙 🆒 🆕 🆓 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 🔢 #️⃣ *️⃣ ⏏️ ▶️ ⏸ ⏯ ⏹ ⏺ ⏭ ⏮ ⏩ ⏪ ⏫ ⏬ ◀️ 🔼 🔽 ➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ ↙️ ↖️ ↕️ ↔️ ↪️ ↩️ ⤴️ ⤵️ 🔀 🔁 🔂 🔄 🔃 🎵 🎶 ➕ ➖ ➗ ✖️ ♾ 💲 💱 ™️ ©️ ®️ 〰️ ➰ ➿ 🔚 🔙 🔛 🔝 🔜 ✔️ ☑️ 🔘 🔴 🟠 🟡 🟢 🔵 🟣 ⚫️ ⚪️ 🟤 🔺 🔻 🔸 🔹 🔶 🔷 🔳 🔲 ▪️ ▫️ ◾️ ◽️ ◼️ ◻️ 🟥 🟧 🟨 🟩 🟦 🟪 ⬛️ ⬜️ 🟫 🔈 🔇 🔉 🔊 🔔 🔕 📣 📢 👁‍🗨 💬 💭 🗯 ♠️ ♣️ ♥️ ♦️ 🃏 🎴 🀄️".split(" "),
  },
  {
    id: "Flags",
    icon: Flag,
    emojis: "🏁 🚩 🎌 🏴 🏳️ 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇺🇸 🇨🇦 🇬🇧 🇦🇺 🇫🇷 🇩🇪 🇪🇸 🇮🇹 🇯🇵 🇰🇷 🇨🇳 🇮🇳 🇧🇷 🇲🇽 🇷🇺 🇿🇦 🇳🇱 🇸🇪 🇳🇴 🇫🇮 🇩🇰 🇨🇭 🇦🇹 🇧🇪 🇵🇹 🇬🇷 🇹🇷 🇵🇱 🇮🇪 🇳🇿".split(" "),
  },
];

type CustomEmoji = { id: string; name: string; url: string; created_by: string };

export function EmojiPicker({
  onSelect, onClose, spaceId, canManageCustom = false,
}: {
  onSelect: (e: string) => void;
  onClose?: () => void;
  spaceId?: string;
  canManageCustom?: boolean;
}) {
  const { user } = useAuth();
  const [active, setActive] = useState(0);
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState<CustomEmoji[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const loadCustom = async () => {
    if (!spaceId) return;
    const { data } = await supabase.from("space_emojis").select("*").eq("space_id", spaceId).order("name");
    setCustom((data ?? []) as CustomEmoji[]);
  };
  useEffect(() => { loadCustom(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [spaceId]);

  const addCustom = async () => {
    if (!user || !spaceId) return;
    const name = newName.toLowerCase().replace(/[^a-z0-9_+-]/g, "");
    if (name.length < 2) return toast.error("Name must be 2+ chars (a-z, 0-9, _ + -)");
    if (!/^https?:\/\//.test(newUrl)) return toast.error("Paste a valid image URL");
    const { error } = await supabase.from("space_emojis").insert({ space_id: spaceId, name, url: newUrl.trim(), created_by: user.id });
    if (error) return toast.error(error.message);
    setNewName(""); setNewUrl(""); setAddOpen(false);
    loadCustom();
  };
  const removeCustom = async (id: string) => {
    const { error } = await supabase.from("space_emojis").delete().eq("id", id);
    if (error) toast.error(error.message); else loadCustom();
  };

  const cat = CATEGORIES[active];
  return (
    <div className="w-80 h-80 bg-popover border rounded-lg shadow-xl flex flex-col overflow-hidden">
      <div className="flex border-b bg-muted/40">
        {spaceId && (
          <button onClick={() => setShowCustom((v) => !v)} title="Custom" className={`flex-1 p-2 flex items-center justify-center ${showCustom ? "bg-background text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-background/50"}`}>
            <Sparkles className="h-4 w-4" />
          </button>
        )}
        {CATEGORIES.map((c, i) => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => { setActive(i); setShowCustom(false); }}
              title={c.id}
              className={`flex-1 p-2 flex items-center justify-center transition-colors ${!showCustom && i === active ? "bg-background text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-background/50"}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
        {onClose && (
          <button onClick={onClose} title="Close" className="p-2 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {showCustom ? (
        <>
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b flex items-center justify-between">
            Custom · this space
            {canManageCustom && (
              <button onClick={() => setAddOpen((v) => !v)} className="p-0.5 hover:bg-accent rounded" title="Add custom emoji">
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
          {addOpen && canManageCustom && (
            <div className="p-2 border-b space-y-1 bg-muted/30">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="name (e.g. partyparrot)" className="w-full text-xs px-2 py-1 rounded border bg-background" />
              <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://image.url/file.png" className="w-full text-xs px-2 py-1 rounded border bg-background" />
              <button onClick={addCustom} className="w-full text-xs py-1 rounded bg-primary text-primary-foreground">Add</button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2 grid grid-cols-6 gap-1 content-start">
            {custom.length === 0 && <div className="col-span-6 text-xs text-muted-foreground text-center py-6">{canManageCustom ? "No custom emojis yet — click + to add one." : "No custom emojis in this space yet."}</div>}
            {custom.map((e) => (
              <div key={e.id} className="relative group">
                <button onClick={() => onSelect(`:${e.name}:`)} title={`:${e.name}:`} className="w-full aspect-square p-1 hover:bg-accent rounded flex items-center justify-center">
                  <img src={e.url} alt={e.name} className="max-h-8 max-w-8 object-contain" />
                </button>
                {canManageCustom && (
                  <button onClick={() => removeCustom(e.id)} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">{cat.id}</div>
          <div className="flex-1 overflow-y-auto p-2 grid grid-cols-8 gap-0.5 content-start">
            {cat.emojis.filter(Boolean).map((e, i) => (
              <button
                key={`${e}-${i}`}
                onClick={() => onSelect(e)}
                className="text-xl p-1 hover:bg-accent rounded transition-colors aspect-square flex items-center justify-center"
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}