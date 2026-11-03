-- TutorIngles — migración 38: la h de "heiße" en la figurada del alemán.
-- La 37 la escribió como jota (JAI-se). La h alemana es un soplo, igual que la
-- inglesa, y con j se raspa: es el error que SONIDOS enseña a evitar.
-- Idempotente.
BEGIN;
UPDATE situation_lines SET note = replace(note, 'JAI-se', 'HAI-se') WHERE note LIKE '%JAI-se%';
COMMIT;
