// simulation-workflow-anomalies.js
// Simulation explicative du système de gestion des anomalies

console.log(`
${''.repeat(90)}
 SIMULATION DU SYSTÈME DE GESTION DES ANOMALIES
${''.repeat(90)}

 RAPPEL DES 3 ACTIONS POSSIBLES:
${''.repeat(90)}

1  VALIDER ()
    Quand ? L'employé a une justification VALABLE
    Exemples: Certificat médical, panne voiture avec justificatif, urgence familiale
    Résultat: 
       Anomalie marquée "validée" 
       Shift NON modifié (le retard a bien eu lieu)
       Reste dans l'historique pour statistiques
       Pas de sanction (justification acceptée)

2  REFUSER ()
    Quand ? AUCUNE justification ou justification NON recevable
    Exemples: Pas de justificatif, "j'ai oublié", récidive sans raison
    Résultat:
       Anomalie marquée "refusée"
       Shift NON modifié (le retard a bien eu lieu)
       Reste dans l'historique
         Sanction possible si récidive (5 refusées = alerte RH)

3  CORRIGER ()
    Quand ? Ce n'était PAS une anomalie - ERREUR ADMINISTRATIVE
    Exemples: Erreur planning, formation oubliée, réunion non saisie, badge HS
    Résultat:
       Anomalie marquée "corrigée"
       Shift MODIFIÉ pour corriger l'erreur
       Audit trail complet (traçabilité)
       Aucune pénalité (pas la faute de l'employé)

${''.repeat(90)}
`);

console.log(`
 SCÉNARIO 1: VALIDATION D'UNE ANOMALIE
${''.repeat(90)}

 CONTEXTE:
   Employé: Pierre Martin
   Date: 28/11/2025
   Type: Retard de 25 minutes (arrivée 9h25 au lieu de 9h00)
   Gravité: Attention
   
 JUSTIFICATION EMPLOYÉ:
   "Panne de voiture sur l'autoroute A6. Dépanneuse appelée à 8h30.
    Facture de dépannage jointe en pièce justificative."

 ACTION MANAGER: VALIDER
   Commentaire: "Certificat de dépannage vérifié. Facture MAIF du 28/11 à 8h45. 
                 Justification recevable."

 RÉSULTAT:
    Statut: validée
    Shift modifié: NON
    Impact: Reste dans historique pour statistiques
    Message: " Anomalie validée ! Justification acceptée."

 IMPACT SUR L'HISTORIQUE:
   Total anomalies: 4
    Validées: 3 (75%)  +1
    Refusées: 1 (25%)
    Corrigées: 0 (0%)
`);

console.log(`
${''.repeat(90)}
 SCÉNARIO 2: REFUS D'UNE ANOMALIE
${''.repeat(90)}

 CONTEXTE:
   Employé: Sophie Bernard
   Date: 29/11/2025
   Type: Retard de 45 minutes (arrivée 9h45 au lieu de 9h00)
   Gravité: Critique
   
 JUSTIFICATION EMPLOYÉ:
   (Aucune justification fournie malgré 2 relances)

 ACTION MANAGER: REFUSER
   Commentaire: "Aucun justificatif malgré 2 relances email. 
                 5ème retard non justifié ce mois. Récidive inacceptable."

 RÉSULTAT:
    Statut: refusée
    Shift modifié: NON
    Impact: Compteur refusées augmente
    Message: " Anomalie refusée ! Justification non recevable."
     ALERTE: 5 anomalies refusées - Suivi RH recommandé!

 IMPACT SUR L'HISTORIQUE:
   Total anomalies: 8
    Validées: 2 (25%)
    Refusées: 5 (62.5%)  +1   SEUIL ALERTE ATTEINT!
    Corrigées: 1 (12.5%)

 ACTION RH RECOMMANDÉE:
    Entretien individuel
    Rappel règlement intérieur
    Procédure disciplinaire si récidive
`);

console.log(`
${''.repeat(90)}
 SCÉNARIO 3: CORRECTION D'UNE ANOMALIE
${''.repeat(90)}

 CONTEXTE:
   Employé: Jean Dubois
   Date: 30/11/2025
   Type: Absence matinée (missing_in)
   Gravité: Critique
   Détails: Pas de pointage entre 9h-12h
   
 ANALYSE MANAGER:
   "L'employé était bien présent ce jour-là! Il était en formation obligatoire
    convoquée en urgence par la Direction. La formation n'a pas été inscrite
    au planning à temps."

 ACTION MANAGER: CORRIGER
   Commentaire: "Formation RGPD obligatoire non planifiée. Erreur administrative."
   
    Correction du shift:
       Type erreur: Formation
       Nouvelle heure: 09:00 (présence confirmée en formation)
       Raison: "Email de convocation formation RGPD du 27/11 envoyé par DRH.
                 Réf: FORM-2024-156. Liste émargement formation jointe."

 RÉSULTAT:
    Statut: corrigée
    Shift modifié: OUI (anomalie supprimée, shift corrigé)
    Audit trail: Ancienne version sauvegardée avec justification complète
    Message: " Anomalie corrigée ! Shift corrigé."

 IMPACT SUR L'HISTORIQUE:
   Total anomalies: 7
    Validées: 4 (57%)
    Refusées: 2 (29%)
    Corrigées: 1 (14%)  +1

 TRAÇABILITÉ COMPLÈTE:
    Qui a corrigé: Manager RH (Sophie Durand)
    Quand: 30/11/2025 à 14:32
    Pourquoi: Formation non planifiée
    Preuve: Email convocation + émargement
    Shift avant: missing_in (9h-12h)
    Shift après: présence formation (9h-12h)
`);

console.log(`
${''.repeat(90)}
 TABLEAU RÉCAPITULATIF DES 3 ACTIONS
${''.repeat(90)}


   ACTION        SHIFT MODIFIÉ          PÉNALITÉ         UTILISATION      

  VALIDER           NON                Aucune       Justificatif OK     
              (l'écart est réel)    (justifié)        (certificat, etc.)  

  REFUSER           NON            Alerte si 5     Pas de justificatif 
              (l'écart est réel)    (récidive)        ou non recevable    

  CORRIGER          OUI                Aucune       Erreur admin/RH     
              (correction erreur)   (pas sa faute)    (planning, badge)   

`);

console.log(`
${''.repeat(90)}
 BONNES PRATIQUES
${''.repeat(90)}

 À FAIRE:
    Toujours demander justificatif avant de décider
    Vérifier authenticité des documents (certificats médicaux, factures)
    Documenter avec commentaire détaillé
    Utiliser CORRIGER uniquement pour erreurs administratives AVÉRÉES
    Suivre les employés avec 5 refusées (entretien RH)

 À NE PAS FAIRE:
    Valider sans justificatif (dilue la valeur des stats)
    Corriger pour "faire plaisir" (fausse la réalité)
    Oublier le commentaire (traçabilité importante)
    Ignorer les récidives (5 refusées = problème réel)

${''.repeat(90)}
 UTILISATION DES STATISTIQUES
${''.repeat(90)}

1. ENTRETIENS ANNUELS:
    Visualiser l'historique complet employé (6 mois)
    Données factuelles vs impressions
    Identifier amélioration ou dégradation

2. GESTION DISCIPLINAIRE:
    Traçabilité légale en cas de procédure
    Preuves horodatées avec commentaires
    Justification des décisions RH

3. PILOTAGE RH:
    Détecter problèmes systémiques (badge HS, planning mal géré)
    Identifier services/équipes à problèmes
    Améliorer les process

${''.repeat(90)}
 SIMULATION TERMINÉE
${''.repeat(90)}

 Pour tester en réel:
   1. Démarrer le serveur: npm run dev
   2. Créer anomalies test: node create-anomalies-test-front.js
   3. Aller dans l'interface web
   4. Ouvrir le panneau "Administration des anomalies"
   5. Tester les 3 actions
   6. Voir l'historique employé avec le bouton "Voir historique"

 Le système est maintenant SIMPLE et EFFICACE !
`);
