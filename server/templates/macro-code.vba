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
