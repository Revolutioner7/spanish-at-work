import * as Speech from "expo-speech";

const MALE_NAMES = ["jorge", "diego", "juan", "carlos", "eddy", "reed", "rocko", "grandpa"];

/**
 * Voz de reserva del iPhone, solo si la voz de Google no responde.
 * Prefiere español de México o Estados Unidos, la mejor calidad instalada y el género del personaje.
 */
export async function pickVoice(gender: "f" | "m"): Promise<string | undefined> {
  try {
    const voices = (await Speech.getAvailableVoicesAsync()).filter((v) => v.language?.toLowerCase().startsWith("es"));
    const region = (lang: string) => (/es-(mx|us)/i.test(lang) ? 1 : 0);
    const tier = (id: string, quality?: string) => {
      const i = id.toLowerCase();
      if (i.includes("premium")) return 3;
      if (i.includes("enhanced") || quality === Speech.VoiceQuality.Enhanced) return 2;
      if (i.includes("siri")) return 1;
      return 0;
    };
    const isMale = (name: string) => MALE_NAMES.some((m) => name.toLowerCase().includes(m));
    const sorted = voices
      .map((v) => ({ v, r: region(v.language), t: tier(v.identifier, v.quality), g: isMale(v.name) ? "m" : "f" }))
      .sort((a, b) => b.r - a.r || b.t - a.t || (a.g === gender ? -1 : 0) - (b.g === gender ? -1 : 0));
    return sorted[0]?.v.identifier;
  } catch {
    return undefined;
  }
}
