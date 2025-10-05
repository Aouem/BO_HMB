# Créer le fichier corrigé
cat > diagnostic_corrige.sql << 'EOF'
-- DIAGNOSTIC COMPLET
PRINT '=== DIAGNOSTIC BASE DE DONNÉES ===';

PRINT '1. TABLES EXISTANTES:';
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;
GO

PRINT '2. STRUCTURE FormSubmissions:';
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'FormSubmissions' ORDER BY ORDINAL_POSITION;
GO

PRINT '3. STRUCTURE FormAnswers:';
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'FormAnswers' ORDER BY ORDINAL_POSITION;
GO

PRINT '4. DONNÉES FormSubmissions:';
SELECT COUNT(*) as TotalSoumissions FROM FormSubmissions;
SELECT TOP 10 * FROM FormSubmissions ORDER BY SubmittedAt DESC;
SELECT CheckListId, COUNT(*) as NbSoumissions FROM FormSubmissions GROUP BY CheckListId;
GO

PRINT '5. DONNÉES FormAnswers:';
SELECT COUNT(*) as TotalReponses FROM FormAnswers;
SELECT TOP 10 * FROM FormAnswers;
SELECT SubmissionId, COUNT(*) as NbReponses FROM FormAnswers GROUP BY SubmissionId;
GO

PRINT '6. RELATIONS:';
SELECT fs.Id as SubmissionId, COUNT(fa.Id) as NbReponses
FROM FormSubmissions fs
LEFT JOIN FormAnswers fa ON fs.Id = fa.SubmissionId
GROUP BY fs.Id
ORDER BY NbReponses DESC;
GO
EOF

# Puis exécuter
sqlcmd -S "localhost,1433" -U SA -P '7devpro#' -d BO_HMB_DB -C -N -i diagnostic_corrige.sql -o resultat_diagnostic.txt
