const MISSIONS = [
  {
    id: 'cardiac', num: 1, icon: '🫀', title: 'Arrêt cardiaque', color: '#ff4488',
    unlocked: true, stars: 0,
    intro: {
      scenario: "Une personne s'effondre brutalement devant toi.\nElle ne répond plus. Elle ne respire plus.",
      objective: "Maintenir la circulation sanguine jusqu'à l'arrivée des secours",
    },
    learn: [
      { icon: '👀', title: 'Évaluer la situation',       body: 'Assure-toi qu\'il n\'y a pas de danger. Parle fort à la victime et secoue doucement son épaule. Si elle ne réagit pas, agis.' },
      { icon: '📞', title: 'Alerter le 15 ou le 112',    body: 'Appelle les secours immédiatement. Donne ta position précise. Si quelqu\'un est là, envoie-le chercher un défibrillateur.' },
      { icon: '🫀', title: 'Compressions thoraciques',   body: 'Place tes deux mains au centre du thorax. Appuie fort et vite — 100 à 120 fois par minute. Ne t\'arrête pas.' },
    ],
    game: { type: 'cardiac', targetBPM: 110, bpmMin: 100, bpmMax: 120, duration: 30 },
    tips: [
      'Les compressions doivent déprimer le thorax de 5 à 6 cm',
      'Ne jamais s\'arrêter plus de 10 secondes entre deux séries',
      'Si quelqu\'un peut te relayer après 2 minutes, accepte',
    ],
  },
  {
    id: 'pls', num: 2, icon: '🤕', title: 'Personne inconsciente', color: '#ffaa00',
    unlocked: false, stars: 0,
    intro: {
      scenario: "Une personne est évanouie mais respire encore.\nSa langue ou ses vomissements pourraient l'étouffer.",
      objective: "La mettre en Position Latérale de Sécurité (PLS)",
    },
    learn: [
      { icon: '🗣️', title: 'Stimuler la victime',      body: 'Parle-lui fort, secoue doucement l\'épaule. Si elle ne réagit pas, vérifie la respiration.' },
      { icon: '👂', title: 'Vérifier la respiration',   body: 'Incline la tête en arrière. Regarde, écoute et sens pendant 10 secondes. Si elle respire → PLS.' },
      { icon: '🤕', title: 'Mettre en PLS',             body: 'Plie son bras et sa jambe côté toi, puis roule-la doucement sur le côté. La bouche doit pointer vers le sol.' },
    ],
    game: { type: 'pls', steps: 5, duration: 50 },
    tips: [
      'La PLS est uniquement pour les inconscients qui respirent',
      'En cas de suspicion de traumatisme cervical, ne pas bouger la victime',
      'Surveille la respiration en attendant les secours',
    ],
  },
  {
    id: 'burn', num: 3, icon: '🔥', title: 'Brûlure', color: '#ff6600',
    unlocked: false, stars: 0,
    intro: {
      scenario: "Un enfant s'est renversé de l'eau bouillante sur le bras.\nLa peau rougit. Il faut agir dans les secondes qui suivent.",
      objective: "Refroidir la brûlure correctement pendant 15 minutes",
    },
    learn: [
      { icon: '💧', title: 'Eau fraîche, pas glacée', body: 'Fais couler de l\'eau à 15–25°C sur la brûlure pendant 15 minutes. Trop froide, ça aggrave les lésions.' },
      { icon: '🚫', title: 'Ce qu\'il ne faut pas faire', body: 'Jamais de glace, de beurre ou de crème. Ne jamais percer les cloques — elles protègent la peau.' },
      { icon: '📞', title: 'Évaluer et alerter',       body: 'Si la brûlure est large (> paume), profonde ou sur le visage, appelle le 15 immédiatement.' },
    ],
    game: { type: 'burn', coverTarget: 0.65, duration: 20 },
    tips: [
      'Retirer vêtements et bijoux SAUF s\'ils collent à la peau',
      'Brûlure chimique : rincer à l\'eau abondamment, 20 minutes',
      'Couvrir avec un film alimentaire non serré — jamais de coton',
    ],
  },
  {
    id: 'bonus', num: 4, icon: '🧠', title: 'Situations mixtes', color: '#8844ff',
    unlocked: false, stars: 0,
    intro: {
      scenario: "Tu arrives sur les lieux d'un accident.\nPlusieurs victimes, plusieurs urgences différentes.",
      objective: "Évaluer, prioriser et agir correctement",
    },
    learn: [
      { icon: '🔍', title: 'Ne pas se précipiter',  body: 'Prends 5 secondes pour évaluer la scène. Y a-t-il un danger ? Combien de victimes ? Qui est prioritaire ?' },
      { icon: '🫀', title: 'Priorité absolue',       body: 'L\'arrêt cardiaque prime tout. Une victime qui ne respire pas passe en premier, toujours.' },
      { icon: '📞', title: 'Organiser les secours',  body: 'Appelle le 15 et donne un bilan complet. Délègue si des témoins sont présents.' },
    ],
    game: { type: 'mixed', rounds: 5, duration: 60 },
    tips: [
      'Tu ne peux pas être partout — priorise sans culpabilité',
      'Le 15 peut te guider en direct si tu es seul face à plusieurs victimes',
      'Garder son calme est la compétence la plus importante',
    ],
  },
];
