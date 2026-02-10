$file = "c:\Users\mouss\Documents\Projets\gestion-rh\client\src\components\PlanningRH.jsx"
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)
$totalLines = $lines.Count
Write-Output "Original line count: $totalLines"

# Track lines to remove (0-indexed)
$linesToRemove = New-Object System.Collections.Generic.HashSet[int]

# Pass 1: Find all console.log lines and mark them for removal
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*console\.log\(') {
        # Check if the line closes the parenthesis
        $open = ([regex]::Matches($lines[$i], '\(')).Count
        $close = ([regex]::Matches($lines[$i], '\)')).Count
        
        $linesToRemove.Add($i) | Out-Null
        
        # If multi-line (parenthesis not closed), find the closing line
        if ($open -gt $close) {
            $j = $i + 1
            while ($j -lt $lines.Count) {
                $open += ([regex]::Matches($lines[$j], '\(')).Count
                $close += ([regex]::Matches($lines[$j], '\)')).Count
                $linesToRemove.Add($j) | Out-Null
                if ($close -ge $open) { break }
                $j++
            }
        }
    }
}

Write-Output "Lines marked for removal: $($linesToRemove.Count)"

# Also check for if blocks that ONLY contain console.log
# Pattern: if (...) { \n console.log(...); \n }
# We need to check lines BEFORE the console.log lines
$additionalRemovals = New-Object System.Collections.Generic.HashSet[int]

foreach ($logLine in ($linesToRemove | Sort-Object)) {
    # Check if the line before is an if-opening block
    $prevLine = $logLine - 1
    while ($prevLine -ge 0 -and $lines[$prevLine].Trim() -eq '') {
        $prevLine--
    }
    
    # Check if next non-blank line after the console.log block is a closing brace
    $nextLine = $logLine + 1
    # Skip other lines in the same multi-line console.log
    while ($linesToRemove.Contains($nextLine)) { $nextLine++ }
    while ($nextLine -lt $lines.Count -and $lines[$nextLine].Trim() -eq '') {
        $nextLine++
    }
    
    # If the previous line is "if (...) {" and next line is "}" 
    if ($prevLine -ge 0 -and $nextLine -lt $lines.Count) {
        $prevTrimmed = $lines[$prevLine].Trim()
        $nextTrimmed = $lines[$nextLine].Trim()
        
        if ($prevTrimmed -match '^if\s*\(.*\)\s*\{$' -and $nextTrimmed -eq '}') {
            # This is an if block that only contains console.log - remove the whole block
            $additionalRemovals.Add($prevLine) | Out-Null
            $additionalRemovals.Add($nextLine) | Out-Null
            # Also remove blank lines between
            for ($k = $prevLine + 1; $k -lt $nextLine; $k++) {
                $additionalRemovals.Add($k) | Out-Null
            }
        }
        # Same for "} else {" pattern with console.log as sole content
        elseif ($prevTrimmed -match '^\}\s*else\s*\{$' -and $nextTrimmed -eq '}') {
            $additionalRemovals.Add($prevLine) | Out-Null
            $additionalRemovals.Add($nextLine) | Out-Null
            for ($k = $prevLine + 1; $k -lt $nextLine; $k++) {
                $additionalRemovals.Add($k) | Out-Null
            }
        }
    }
}

foreach ($line in $additionalRemovals) {
    $linesToRemove.Add($line) | Out-Null
}

Write-Output "Total lines to remove (including empty if blocks): $($linesToRemove.Count)"

# Build the new file content
$newLines = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $lines.Count; $i++) {
    if (-not $linesToRemove.Contains($i)) {
        $newLines.Add($lines[$i])
    }
}

Write-Output "New line count: $($newLines.Count)"
Write-Output "Lines removed: $($totalLines - $newLines.Count)"

# Write back
[System.IO.File]::WriteAllLines($file, $newLines.ToArray(), [System.Text.Encoding]::UTF8)
Write-Output "File saved successfully."

# Verify
$verifyLines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)
$remaining = ($verifyLines | Where-Object { $_ -match 'console\.log' }).Count
Write-Output "Remaining console.log statements: $remaining"
