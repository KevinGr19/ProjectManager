# ProjectManager
## Objectif
Cette application en HTML, CSS, JS permet de créer et gérer des projets depuis le navigateur.<br>
Toutes les données sont stockées dans la base de données locale **IndexedDB**.<br>

*Attention: IndexedDB étant rattaché au navigateur, vous ne pouvez pas utiliser l'application sur plusieurs navigateurs ou appareils différents !*

## Fonctionnalités
### Création de projet
Un projet est constitué :
- D'un **titre** et d'une **description**
- **D'images** (fichiers, URLs)
- De **tâches**
- De **notes** de projet

Toutes les données sont **datées**, permettant ainsi d'historiser son travail et sa progression.

### Gestion de projet
Vous pouvez gérer un projet en cours en créeant des **tâches**. Ces tâches contiennent :
- Un **nom** et une **description**
- Un **état** (non-terminée, terminée)
- Un ensemble de **sous-tâches** (titre, état)

Vous pouvez également les **ranger** dans l'ordre souhaité (drag & drop).
Cela vous permet d'organiser les tâches à faire et de vous concentrer sur l'essentiel.

### Notes
Vous pouvez ajouter des **notes** de projet. Ces notes contiennent :
- Un **titre**
- Une **description**
- Des **images** (fichiers, URLs)

Ces notes peuvent être témoins de vos idées, votre avancement au cours du projet, et plus.

### Tri des projets et étiquettes
Vous pouvez voir la liste complète de vos projets sur la page principale. Vous pouvez les rechercher par **mots-clés**, mais également par **étiquettes**.<br><br>
Les **étiquettes** vous permettent de rapidement trier vos projets avec :
- Un **label**
- Une **couleur**

Vous pouvez créer et attacher autant d'étiquettes à votre projet que vous le souhaitez.<br>

## Installation
Clonez simplement le projet sur votre appareil, et lancer le *index.html* pour ouvrir l'application.<br>
L'application n'utilise aucun framework front-end.<br>
Pour un accès plus pratique (facultatif), installez un serveur web sur localhost pour servir l'application (Apache, Nginx, etc).

<br>*Ce projet a été développé en priotisant la vélocité plûtot que la qualité de code. De ce fait résulte l'optimisation inexistante de l'application.*
