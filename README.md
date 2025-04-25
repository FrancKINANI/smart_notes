# SmartNotes

SmartNotes est une application innovante qui transforme vos notes manuscrites ou numériques en un outil d’apprentissage intelligent. Grâce à ses fonctionnalités avancées, SmartNotes réorganise vos cours, génère des quiz personnalisés, crée des podcasts et visuels éducatifs, et vous aide à réviser efficacement avec des rappels adaptés.

---

## 🚀 Fonctionnalités principales

- **Réorganisation des cours** : Vos notes sont restructurées automatiquement pour une meilleure compréhension.
- **Quiz personnalisés** : Création de quiz adaptés à partir de vos notes pour renforcer votre apprentissage.
- **Podcasts et visuels** : Génération de contenus audio et graphiques pour diversifier votre expérience d’apprentissage.
- **Rappels intelligents** : Notifications adaptées à votre progression pour une révision efficace.

---

## 🛠️ Technologies utilisées

### Langages :
- **TypeScript** (99 %)
- **HTML**, **CSS**
- **JavaScript**

### Frameworks et bibliothèques :
**Frontend** :
- [React](https://reactjs.org/) : Bibliothèque JavaScript pour créer des interfaces utilisateur dynamiques.
- [Radix UI](https://www.radix-ui.com/) : Ensemble de composants React accessibles.
- [TailwindCSS](https://tailwindcss.com/) : Framework CSS utilitaire pour un design rapide et esthétique.
- [Framer Motion](https://www.framer.com/motion/) : Animations avancées pour React.

**Backend** :
- [Express](https://expressjs.com/) : Framework minimaliste pour construire des applications web rapides.
- [Drizzle ORM](https://orm.drizzle.team/) : ORM pour la gestion des bases de données.
- [Passport](https://www.passportjs.org/) : Middleware pour l’authentification.
- [MySQL2](https://github.com/sidorares/node-mysql2) : Client MySQL rapide pour Node.js.

**Autres outils** :
- [Vite](https://vitejs.dev/) : Outil de build rapide pour les projets modernes.
- [Zod](https://zod.dev/) : Validation de schémas de données.
- [OpenAI API](https://platform.openai.com/docs/) : Utilisé pour des fonctionnalités avancées d’intelligence artificielle.

---

## 📦 Installation

1. **Clonez le dépôt** :
   ```bash
   git clone https://github.com/FrancKINANI/smart_notes.git
   cd smart_notes
   ```

2. **Installez les dépendances** :
   ```bash
   npm install
   ```

3. **Configurez les variables d’environnement** : Créez un fichier `.env` à la racine du projet et définissez les variables nécessaires.

4. **Démarrez le projet en mode développement** :
   ```bash
   npm run dev
   ```

5. **Build pour la production** :
   ```bash
   npm run build
   npm start
   ```

---

## 📚 Documentation

### Scripts disponibles
- `npm run dev` : Lance le projet en mode développement.
- `npm run build` : Compile le projet pour la production.
- `npm start` : Démarre le projet en mode production.
- `npm run check` : Vérifie le typage TypeScript.
- `npm run db:push` : Synchronise les migrations de la base de données avec **Drizzle ORM**.

### Structure des fichiers
- **/src** : Code source principal (frontend et backend).
- **/server** : API backend et logique serveur.
- **/public** : Fichiers statiques.
- **/dist** : Fichiers compilés pour la production.

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet.
2. Créez une branche spécifique pour vos modifications :
   ```bash
   git checkout -b feature/ma-fonctionnalite
   ```
3. Faites vos modifications et commitez-les :
   ```bash
   git commit -m "Ajout d'une nouvelle fonctionnalité"
   ```
4. Poussez vos modifications :
   ```bash
   git push origin feature/ma-fonctionnalite
   ```
5. Ouvrez une **Pull Request** sur le dépôt principal.

---

## 🛡️ Licence

Ce projet est sous licence [MIT](LICENSE).

---

## 🌟 Remerciements

Merci à tous les contributeurs et utilisateurs de **SmartNotes** pour leur soutien et leurs idées. Ensemble, nous rendons l’apprentissage plus intelligent et accessible !
```

Ce fichier README inclut une description complète du projet, les technologies utilisées, les instructions d'installation, la documentation de base, et des informations pour contribuer. Vous pouvez l'adapter selon vos besoins spécifiques.