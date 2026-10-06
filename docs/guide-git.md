# Travailler avec Git

## Branches communes et branches de tâches

`main` est la branche commune de référence, à sélectionner aussi comme branche par défaut dans GitHub.
Les 117 noms de branches suivent le plan : une tâche, une branche, une petite PR.
Les branches `docs/GOV-06-modele-issue` et `front-end` conservent leur historique existant.
Les tâches déjà intégrées ne doivent pas être redéveloppées : vérifier leur état avec le reviewer.

## Première utilisation sur un autre poste

```bash
git clone --branch main git@github.com:LopbeiroJoel/MercaSport.git
cd MercaSport
code .
```

## Commencer une tâche

Depuis un terminal Bash à la racine du dépôt, avec les changements précédents enregistrés :

```bash
bash scripts/commencer-tache.sh UX-03
```

Ce script vérifie l'état local, récupère GitHub, sélectionne la branche de la tâche et intègre le dernier `origin/main` par fusion.
Il ne pousse rien et s'arrête si un conflit demande une résolution.
Lire ensuite la fiche et compléter les dépendances et tests avec le reviewer.

## Enregistrer et proposer son travail

```bash
git status
git add chemin/du/fichier
git commit -m "UX-03 Décrire le changement"
git push
```

Ouvrir une PR de la branche de tâche vers `main`, la relier à son Issue et demander une review.
Relire la Definition of Done avec le reviewer avant de fusionner.

## Mettre à jour sa branche pendant le travail

Après avoir enregistré les changements en cours :

```bash
git fetch origin
git merge origin/main
```

En cas de conflit, lire les fichiers indiqués et résoudre avec l'autre auteur avant de poursuivre.
Ne pas utiliser de push forcé ni supprimer une branche qui contient encore du travail utile.

## Responsabilités

- Thomas : dominante frontend, reviewer habituel Joel.
- Joel : dominante SQL/données, reviewer habituel Matteo.
- Matteo : dominante backend, reviewer habituel Thomas.

L'affectation exacte de chaque tâche est dans `docs/equipe` et `docs/taches`.
Les noms de branches ne sont pas des branches personnelles permanentes.

## Préparation et réalisation

Les fichiers SQL et les fiches sont préparés avec des repères, sans déclarer les fonctionnalités réalisées.
La base HTML existante est conservée ; ses pages manquantes et exemples statiques restent à traiter dans les tâches front.
La création anticipée des branches ne remplace pas la lecture des dépendances et l'actualisation depuis `main`.
