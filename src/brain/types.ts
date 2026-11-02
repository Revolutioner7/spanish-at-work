// Piezas de un perfil. Cada persona tiene su reparto de personajes y su recorrido:
// la estructura es la misma para todos, solo cambian los temas.

export type Character = {
  id: string;
  name: string;
  age: number;
  tagline: string; // lo que ve el alumno en la tarjeta (en inglés)
  difficulty: 1 | 2 | 3;
  color: string;
  speechRate: number; // 1 = normal
  voiceGender: "f" | "m";
  googleVoice: string; // voz natural de Google (Chirp 3 HD, es-US)
  sheet: string; // ficha que recibe el modelo (en español)
  opener: string; // primera frase si no hay memoria previa
};

export type Tappa = {
  id: string;
  characterId: string;
  title: string; // en español
  emoji: string;
  mission: string; // lo que ve el alumno (en inglés: es una instrucción, no una traducción)
  check: string; // criterio para el repaso
  steer: string; // instrucción para el personaje
};

export type Profile = {
  id: string;
  setting: string; // dónde se conocen los personajes (para el modelo)
  characters: Character[];
  tappe: Tappa[];
  monologueTopics: string[]; // en inglés
};
