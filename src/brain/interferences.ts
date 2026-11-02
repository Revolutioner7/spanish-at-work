// Interferencias típicas del inglés hacia el español.
// La tarjeta (en inglés, la lengua del alumno) se muestra cuando un mismo error se repite tres veces.

export type Interference = {
  code: string;
  priority: 1 | 2 | 3; // 1 cambia el significado, 2 suena mal, 3 se fosiliza
  what: string;
  example: string;
  card: string;
};

export const INTERFERENCES: Interference[] = [
  // Pronunciación
  { code: "PRON-VOWELS", priority: 1, what: "Reducing unstressed vowels to an 'uh' sound", example: "«cuh-MEE-duh» for comida", card: "Spanish has five short, pure vowels and they never change: a, e, i, o, u sound the same in every syllable." },
  { code: "PRON-STRESS", priority: 1, what: "Stress on the wrong syllable", example: "papa / papá, esta / está, hablo / habló", card: "Stress can change the meaning: «hablo» is I speak, «habló» is he spoke. A written accent always marks the stressed syllable." },
  { code: "PRON-R", priority: 2, what: "English r instead of the Spanish tap or roll", example: "pero / perro, caro / carro", card: "Single r between vowels is a quick tap of the tongue, like the tt in 'butter'. rr and r at the start of a word roll." },
  { code: "PRON-H", priority: 2, what: "Pronouncing the h", example: "«hhhola», «hhhotel»", card: "In Spanish the h is always silent: «hola» sounds like 'ola'." },
  { code: "PRON-J-G", priority: 2, what: "English sounds for j and soft g", example: "«José» like 'Joe-say'", card: "Spanish j (and g before e or i) is a breathy sound from the back of the throat, like a strong h: «José», «gente»." },
  { code: "PRON-LL-Y", priority: 3, what: "Saying ll like an English l", example: "«pol-lo» for pollo", card: "ll sounds like the y in 'yes': «pollo», «llamo»." },
  // Gramática
  { code: "GRAM-SER-ESTAR", priority: 1, what: "Mixing up ser and estar", example: "«soy cansado», «está ingeniero»", card: "Ser is for what something is (job, origin, character). Estar is for how or where it is right now: «soy ingeniero», «estoy cansado»." },
  { code: "GRAM-GENDER", priority: 2, what: "Article or adjective not matching the noun", example: "«el casa», «la café es buena»", card: "Every noun is masculine or feminine, and the article and adjectives follow it: «la casa blanca», «el café bueno»." },
  { code: "GRAM-GUSTAR", priority: 1, what: "Using gustar like 'to like'", example: "«yo gusto el café»", card: "Gustar works like 'to please': the thing is the subject. «Me gusta el café», «me gustan los libros»." },
  { code: "GRAM-TENER", priority: 2, what: "Using ser/estar where Spanish uses tener", example: "«soy 50 años», «estoy hambre»", card: "Age, hunger, cold and thirst go with tener: «tengo 50 años», «tengo hambre»." },
  { code: "GRAM-PAST", priority: 2, what: "Avoiding the past or mixing preterite and imperfect", example: "«ayer voy al cine»", card: "For a finished action at a point in time, use the preterite: «ayer fui al cine». For what used to happen or background, the imperfect: «iba mucho»." },
  { code: "GRAM-POR-PARA", priority: 2, what: "Mixing up por and para", example: "«gracias para todo», «es por ti» (as a gift)", card: "Para points to a goal or receiver: «es para ti». Por is the cause, exchange or route: «gracias por todo»." },
  { code: "GRAM-YO", priority: 3, what: "Saying yo in almost every sentence", example: "«yo creo que yo voy»", card: "The verb ending already says who: «creo que voy». Use yo only for contrast." },
  { code: "GRAM-ADJ-ORDER", priority: 3, what: "Putting the adjective before the noun", example: "«un rojo coche»", card: "Most adjectives go after the noun: «un coche rojo», «una idea buena»." },
  { code: "GRAM-PERSONAL-A", priority: 3, what: "Missing the personal a", example: "«veo mi amigo»", card: "When a person is the object, add a: «veo a mi amigo», «conozco a Lupita»." },
  // Falsos amigos
  { code: "FA-EMBARAZADA", priority: 1, what: "embarazada = pregnant (not embarrassed)", example: "«estoy embarazada» meaning embarrassed", card: "Embarazada means pregnant. Embarrassed is «me da vergüenza» or «estoy avergonzado»." },
  { code: "FA-ACTUAL", priority: 1, what: "actual / actualmente = current / currently", example: "«actualmente» meaning actually", card: "Actualmente means currently. Actually is «en realidad» or «de hecho»." },
  { code: "FA-REALIZAR", priority: 1, what: "realizar = to carry out (not to realize)", example: "«realicé que…»", card: "Realizar is to do or carry out. To realize is «darse cuenta»: «me di cuenta de que…»." },
  { code: "FA-ASISTIR", priority: 1, what: "asistir = to attend (not to assist)", example: "«te asisto» meaning I help you", card: "Asistir a is to attend: «asistí al concierto». To help is «ayudar»." },
  { code: "FA-LIBRERIA", priority: 1, what: "librería = bookstore (not library)", example: "«voy a la librería a sacar un libro»", card: "Librería is a bookstore. A library is «biblioteca»." },
  { code: "FA-EXITO", priority: 1, what: "éxito = success (not exit)", example: "«¿dónde está el éxito?»", card: "Éxito is success. The exit is «la salida»." },
  { code: "FA-CARPETA", priority: 1, what: "carpeta = folder (not carpet)", example: "«una carpeta en el suelo»", card: "Carpeta is a folder. A carpet is «alfombra»." },
  { code: "FA-SOPORTAR", priority: 1, what: "soportar = to put up with (not to support)", example: "«soporto a mi equipo»", card: "Soportar is to tolerate. To support someone is «apoyar»: «apoyo a mi equipo»." },
  { code: "FA-GRABAR", priority: 2, what: "record = grabar (recordar is to remember)", example: "«recordé una canción» meaning recorded", card: "Recordar is to remember. To record audio or video is «grabar»." },
  { code: "FA-CONSTIPADO", priority: 1, what: "constipado = having a cold (in some countries)", example: "«estoy constipado» meaning constipated", card: "Avoid «constipado»: it usually means having a cold. Say «tengo gripa» (Mexico) or «estoy resfriado»." },
];

export function interferencesForPrompt(): string {
  return INTERFERENCES.map((i) => `${i.code} (priority ${i.priority}): ${i.what}. E.g. ${i.example}`).join("\n");
}

export function findInterference(code: string): Interference | undefined {
  return INTERFERENCES.find((i) => i.code === code);
}
