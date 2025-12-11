# 📋 Instructions pour créer le template Excel avec macro

## Étape 1 : Créer le fichier Excel avec macros

1. **Ouvrir Excel** (version complète, pas Excel Online)
2. **Créer un nouveau classeur**
3. **Enregistrer immédiatement** sous le nom : `rapport-heures-template.xlsm`
   - Format : **Classeur Excel prenant en charge les macros (*.xlsm)**
   - Emplacement : `server/templates/rapport-heures-template.xlsm`

## Étape 2 : Activer l'onglet Développeur

1. **Fichier** → **Options** → **Personnaliser le ruban**
2. Cocher ☑️ **Développeur** dans la liste de droite
3. Cliquer **OK**

## Étape 3 : Créer la macro

1. Cliquer sur l'onglet **Développeur**
2. Cliquer sur **Visual Basic** (ou appuyer sur `Alt + F11`)
3. Dans le menu : **Insertion** → **Module**
4. Copier-coller le code VBA ci-dessous dans le module :

```vba
Sub AjouterJustificatif()
    Dim fd As FileDialog
    Dim selectedFile As String
    Dim objOLE As OLEObject
    Dim targetCell As Range
    
    ' Récupérer la cellule active
    Set targetCell = ActiveCell
    
    ' Vérifier que la cellule est dans la colonne JUSTIFICATIF (colonne 8 = H)
    If targetCell.Column <> 8 Then
        MsgBox "⚠️ Veuillez d'abord cliquer sur une cellule bleue" & vbCrLf & _
               "(colonne JUSTIFICATIF NAVIGO)", vbExclamation, "Attention"
        Exit Sub
    End If
    
    ' Créer le dialogue de sélection de fichier
    Set fd = Application.FileDialog(msoFileDialogFilePicker)
    
    With fd
        .Title = "Sélectionner le justificatif Navigo"
        .Filters.Clear
        .Filters.Add "Images", "*.jpg;*.jpeg;*.png"
        .Filters.Add "Documents PDF", "*.pdf"
        .Filters.Add "Tous les fichiers", "*.*"
        .AllowMultiSelect = False
        
        ' Si l'utilisateur sélectionne un fichier
        If .Show = -1 Then
            selectedFile = .SelectedItems(1)
            
            ' Supprimer l'ancien objet s'il existe dans cette cellule
            On Error Resume Next
            For Each objOLE In ActiveSheet.OLEObjects
                If Not Intersect(objOLE.TopLeftCell, targetCell) Is Nothing Then
                    objOLE.Delete
                End If
            Next objOLE
            On Error GoTo 0
            
            ' Insérer le nouveau fichier comme icône compacte
            Set objOLE = ActiveSheet.OLEObjects.Add( _
                Filename:=selectedFile, _
                Link:=False, _
                DisplayAsIcon:=True, _
                IconFileName:="shell32.dll", _
                IconIndex:=0, _
                Left:=targetCell.Left + 2, _
                Top:=targetCell.Top + 2, _
                Width:=targetCell.Width - 4, _
                Height:=targetCell.Height - 4)
            
            MsgBox "✅ Justificatif ajouté avec succès !" & vbCrLf & vbCrLf & _
                   "Double-cliquez sur l'icône pour ouvrir le fichier.", _
                   vbInformation, "Succès"
        End If
    End With
    
    Set fd = Nothing
    Set targetCell = Nothing
End Sub

Sub Auto_Open()
    ' Configurer le raccourci clavier CTRL+J
    Application.OnKey "^j", "AjouterJustificatif"
    
    ' Message d'accueil
    MsgBox "📋 RAPPORT HEURES & ABSENCES" & vbCrLf & vbCrLf & _
           "Pour ajouter un justificatif Navigo :" & vbCrLf & _
           "1️⃣ Cliquez sur une cellule bleue (colonne JUSTIFICATIF)" & vbCrLf & _
           "2️⃣ Appuyez sur CTRL+J" & vbCrLf & _
           "3️⃣ Sélectionnez votre fichier (JPG, PNG, PDF)" & vbCrLf & vbCrLf & _
           "➡️ Le fichier sera inséré comme icône compacte.", _
           vbInformation, "Mode d'emploi"
End Sub

Sub Auto_Close()
    ' Retirer le raccourci à la fermeture
    Application.OnKey "^j"
End Sub
```

## Étape 4 : Créer une feuille de travail

1. **Revenir à Excel** (fermer Visual Basic ou `Alt + Q`)
2. **Renommer la feuille** en : `Rapport Heures`
3. Ajouter quelques données de test si vous voulez (optionnel)
   - Le backend va effacer et recréer toutes les lignes automatiquement

## Étape 5 : Enregistrer et tester

1. **Enregistrer** le fichier (`Ctrl + S`)
2. **Fermer Excel**
3. **Vérifier** que le fichier `rapport-heures-template.xlsm` existe dans :
   ```
   C:\Users\mouss\Documents\Projets\gestion-rh\server\templates\
   ```

## Étape 6 : Tester avec le serveur

1. **Redémarrer le serveur** :
   ```powershell
   cd server
   npm run dev
   ```

2. **Générer un rapport** depuis l'interface web (Rapports > Heures)

3. **Télécharger** le fichier → Il devrait maintenant s'appeler `.xlsm`

4. **Ouvrir le fichier** :
   - Excel demandera d'**Activer les macros** → Cliquer **Activer le contenu**
   - Un message d'accueil devrait s'afficher
   - Cliquer sur une cellule bleue (colonne JUSTIFICATIF)
   - Appuyer sur `CTRL + J`
   - L'explorateur de fichiers devrait s'ouvrir ! 🎉

## ⚠️ Dépannage

**Si le raccourci CTRL+J ne fonctionne pas :**
- Vérifier que les macros sont activées
- Fichier → Options → Centre de gestion de la confidentialité → Paramètres → Activer toutes les macros

**Si le fichier téléchargé est toujours .xlsx :**
- Vérifier que le template existe bien dans `server/templates/`
- Vérifier les logs du serveur pour voir si le template est chargé

**Si Excel refuse d'ouvrir le fichier :**
- Le fichier template est peut-être corrompu
- Recréer le template en suivant les étapes ci-dessus

## 📝 Notes importantes

- Le template **doit** avoir l'extension `.xlsm` (avec macros)
- Le nom **doit** être exactement : `rapport-heures-template.xlsm`
- La macro `Auto_Open` s'exécute automatiquement à l'ouverture
- Le raccourci `CTRL+J` est configuré par cette macro
