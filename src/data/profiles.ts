// Practice sets. Every conversation has the same structure:
// a situation, a character (invented, Mexican Spanish speaker) and a concrete goal.
// Only the topics change from person to person.

export type Conversation = {
  id: string;
  title: string; // shown to the learner, in English
  situation: string; // in English, so a beginner understands the setup
  character: { name: string; role: string }; // speaks Mexican Spanish
  goal: string; // what the learner has to achieve, in English
  opener: string; // the character's first line, in Spanish
};

export type Profile = {
  id: string;
  conversations: Conversation[];
};

export const PROFILES: Record<string, Profile> = {
  scott: {
    id: 'scott',
    conversations: [
      {
        id: 'festival-tickets',
        title: 'Festival tickets',
        situation: 'You are at the box office of an outdoor music festival.',
        character: { name: 'Lupita', role: 'ticket seller' },
        goal: 'Buy two tickets and ask where the best spot to watch the show is.',
        opener: '¡Buenas tardes! ¿Cuántos boletos va a querer?',
      },
      {
        id: 'red-rocks-friend',
        title: 'Convince a friend',
        situation: 'Dinner with a friend who has never been to a big outdoor concert.',
        character: { name: 'Javier', role: 'old friend' },
        goal: 'Convince him to come with you to a concert at Red Rocks.',
        opener: 'Oye, ¿y qué planes tienes para el fin de semana?',
      },
      {
        id: 'lobster-roll',
        title: 'Lobster roll in Maine',
        situation: 'A small seafood restaurant on the coast of Maine.',
        character: { name: 'Don Ramón', role: 'waiter' },
        goal: 'Order a lobster roll exactly the way you like it.',
        opener: 'Bienvenido. ¿Ya sabe qué va a pedir o le recomiendo algo?',
      },
      {
        id: 'bookstore-gift',
        title: 'A book as a gift',
        situation: 'A neighborhood bookstore.',
        character: { name: 'Mariana', role: 'bookseller' },
        goal: 'Ask for a book to give as a present and explain why you chose it.',
        opener: 'Hola, ¿busca algo en especial?',
      },
      {
        id: 'coffee-at-home',
        title: 'How you make your coffee',
        situation: 'A specialty coffee shop, chatting at the counter.',
        character: { name: 'Toño', role: 'barista' },
        goal: 'Explain how you make coffee at home, including your grinder.',
        opener: '¿Qué le sirvo? Por cierto, ¿usted toma café en casa?',
      },
      {
        id: 'greek-myth',
        title: 'A myth on a tour',
        situation: 'A guided tour of ancient ruins in Greece.',
        character: { name: 'Elena', role: 'tour guide' },
        goal: 'Tell the guide a Greek myth you know and ask her for another one.',
        opener: 'Bueno, aquí empieza el recorrido. ¿Conoce algún mito griego?',
      },
      {
        id: 'game-night',
        title: 'Game night rules',
        situation: 'A game night with new friends who have never played Diplomacy.',
        character: { name: 'Sofía', role: 'new friend' },
        goal: 'Explain the basic rules of Diplomacy so everyone can start playing.',
        opener: 'Nunca he jugado esto. ¿De qué se trata?',
      },
      {
        id: 'apple-store',
        title: 'iMessage trouble',
        situation: 'An Apple store, at the support desk.',
        character: { name: 'Diego', role: 'store employee' },
        goal: 'Explain a problem with iMessage and ask for help fixing it.',
        opener: 'Hola, bienvenido. ¿En qué le puedo ayudar hoy?',
      },
      {
        id: 'documentary',
        title: 'Recommend a documentary',
        situation: 'Leaving the movie theater with a friend.',
        character: { name: 'Carmen', role: 'friend' },
        goal: 'Recommend a documentary and explain what it is about.',
        opener: 'Qué buena película. ¿Y tú qué has visto últimamente?',
      },
      {
        id: 'chicago-train',
        title: 'Movies in Chicago',
        situation: 'On a train in Chicago, next to a tourist.',
        character: { name: 'Raúl', role: 'tourist from Monterrey' },
        goal: 'Tell him which movies were filmed in Chicago and where.',
        opener: 'Disculpe, es mi primera vez en Chicago. ¿Qué me recomienda ver?',
      },
    ],
  },
};
