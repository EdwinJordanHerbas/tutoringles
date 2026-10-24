-- TutorIngles — migration_35_ia_credito_mensual.sql
-- El crédito de la API es MENSUAL: el plan Max 5x da 100 $ en cada ciclo de
-- facturación y lo que no se gasta caduca (comprobado en la consola el
-- 24-oct-2026). Un tope de 15 $ al mes dejaba caducar 85. Sube a 90 $ (margen
-- para no llegar al saldo comprado), sólo si nadie lo ha cambiado a mano.
BEGIN;
UPDATE config SET value = '90' WHERE key = 'ia_tope_mes' AND value = '15';
COMMIT;
