Write-Host "🔍 VÉRIFICATION DES EMPLOYÉS ACTIFS DANS LE RAPPORT`n" -ForegroundColor Cyan

# 1. Login
Write-Host "🔐 Connexion admin..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/auth/login" `
        -Method Post `
        -Body (@{email="admin@gestionrh.com"; password="Admin123!"} | ConvertTo-Json) `
        -ContentType "application/json"
    
    $token = $loginResponse.token
    Write-Host "✅ Token récupéré`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur de connexion: $_" -ForegroundColor Red
    exit 1
}

# 2. Récupérer les stats globales
Write-Host "📊 Récupération des stats RH..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "http://localhost:5000/stats" `
        -Headers @{Authorization="Bearer $token"}
    
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "STATS RH GLOBALES" -ForegroundColor White -BackgroundColor DarkCyan
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Total employés (DB):      $($stats.totalEmployes)" -ForegroundColor White
    Write-Host "  Employés ACTIFS:          $($stats.employesActifs)" -ForegroundColor Green
    Write-Host "  Employés inactifs/partis: $($stats.employesInactifs)" -ForegroundColor Red
    Write-Host "  Pointés aujourd'hui:      $($stats.pointes)" -ForegroundColor Yellow
    Write-Host ""
} catch {
    Write-Host "❌ Erreur stats: $_" -ForegroundColor Red
    exit 1
}

# 3. Tester l'export Excel pour novembre 2025
Write-Host "📄 Export du rapport Excel novembre 2025..." -ForegroundColor Yellow
try {
    $exportUrl = "http://localhost:5000/rapports/export-all?periode=mois&mois=2025-11&format=excel"
    
    # Télécharger le fichier
    $response = Invoke-WebRequest -Uri "$exportUrl" `
        -Headers @{Authorization="Bearer $token"} `
        -OutFile "rapport-verification.xlsx"
    
    $fileSize = (Get-Item "rapport-verification.xlsx").Length
    Write-Host "✅ Rapport généré: $fileSize bytes" -ForegroundColor Green
    Write-Host "   Fichier: rapport-verification.xlsx`n" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erreur export: $_" -ForegroundColor Red
    exit 1
}

# 4. Vérification manuelle requise
Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "VÉRIFICATION BASE DE DONNÉES" -ForegroundColor White -BackgroundColor DarkCyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`n⚠️  VÉRIFICATION MANUELLE REQUISE:" -ForegroundColor Yellow
Write-Host "1. Ouvrir le fichier: rapport-verification.xlsx" -ForegroundColor White
Write-Host "2. Compter le nombre de lignes (employés) dans le rapport" -ForegroundColor White
Write-Host "3. Vérifier que le nombre correspond aux employés ACTIFS: $($stats.employesActifs)" -ForegroundColor Green
Write-Host "4. Le rapport NE DOIT PAS contenir les employés partis/inactifs" -ForegroundColor Red
Write-Host ""

# 5. Résumé des vérifications à faire
Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "CHECKLIST DE VÉRIFICATION" -ForegroundColor White -BackgroundColor DarkCyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Dans le fichier Excel 'rapport-verification.xlsx':" -ForegroundColor Yellow
Write-Host ""
Write-Host "  ✓ Nombre d'employés listés = $($stats.employesActifs) (ACTIFS)" -ForegroundColor Green
Write-Host "  ✗ Nombre d'employés listés ≠ $($stats.totalEmployes) (TOTAL avec inactifs)" -ForegroundColor Red
Write-Host ""
Write-Host "  ✓ Vérifier qu'aucun employé avec statut='inactif' n'apparaît" -ForegroundColor Green
Write-Host "  ✓ Vérifier qu'aucun employé avec dateSortie passée n'apparaît" -ForegroundColor Green
Write-Host ""
Write-Host "Pour voir les employés inactifs exclus du rapport:" -ForegroundColor Yellow
Write-Host "  - Aller dans Admin > Gestion Employés" -ForegroundColor White
Write-Host "  - Filtrer par statut 'inactif' ou avec date de départ" -ForegroundColor White
Write-Host "  - Ces employés NE DOIVENT PAS être dans le rapport Excel" -ForegroundColor Red
Write-Host ""

# 6. Test de cohérence supplémentaire
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "TEST DE COHÉRENCE" -ForegroundColor White -BackgroundColor DarkCyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$attendu = $stats.employesActifs
Write-Host "📊 Nombre d'employés ACTIFS attendu dans le rapport: $attendu" -ForegroundColor Green
Write-Host "📊 Nombre d'employés TOTAL dans la DB: $($stats.totalEmployes)" -ForegroundColor Yellow
Write-Host "📊 Écart (employés exclus car inactifs): $($stats.employesInactifs)" -ForegroundColor Red
Write-Host ""

if ($stats.employesInactifs -gt 0) {
    Write-Host "⚠️  ATTENTION: Il y a $($stats.employesInactifs) employé(s) inactif(s)" -ForegroundColor Yellow
    Write-Host "   Ces employés ne doivent PAS apparaître dans le rapport Excel!" -ForegroundColor Red
    Write-Host ""
} else {
    Write-Host "✅ Tous les employés sont actifs, pas de filtrage nécessaire" -ForegroundColor Green
    Write-Host ""
}

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ VÉRIFICATION TERMINÉE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Fichier généré: rapport-verification.xlsx" -ForegroundColor White
Write-Host "Ouvrir le fichier et compter les lignes pour confirmer!" -ForegroundColor Yellow
Write-Host ""
