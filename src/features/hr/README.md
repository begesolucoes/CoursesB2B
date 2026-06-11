# Módulo de RH (Administração do Cliente)

Este diretório contém os componentes e lógica de negócios específicos para os gestores de RH das empresas clientes.

## Componentes a serem criados aqui:
- `HRDashboard.tsx`: Componente de métricas gerais e gráficos de adesão da empresa.
- `UserManagementTable.tsx`: Tabela de listagem de colaboradores com busca, filtros e modais de criação/importação.
- `CSVImportModal.tsx`: Interface para arrastar planilhas CSV e enviar os dados dos novos alunos.
- `CourseManagement.tsx`: Listagem de cursos contratados e upload de novos pacotes zip SCORM.
- `CourseUploadForm.tsx`: Formulário de criação de curso e integração de upload via Presigned URL direto para o Cloudflare R2.
- `HRReports.tsx`: Tela de filtros e exportação de CSV contendo a auditoria geral de conformidade de treinamentos.
