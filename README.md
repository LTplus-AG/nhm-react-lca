# NHMzh LCA UI

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Version](https://img.shields.io/badge/Version-0.0.1-brightgreen.svg)](https://github.com/LTplus-AG/LCA-Cost-NHMzh)

Weboberfläche für NHMzh Module Kostenberechnung & LCA. Diese Benutzeroberfläche bietet die Frontend-Lösung für die Interaktion mit dem NHMzh-Modulsystem.

## Inhaltsverzeichnis

- [Funktionen](#funktionen)
- [Kontext](#kontext)
- [Erste Schritte](#erste-schritte)
- [Projektstruktur](#projektstruktur)
- [Umgebungsvariablen](#umgebungsvariablen)
- [Technologie-Stack](#technologie-stack)
- [API-Integration](#api-integration)
- [Wichtiger Hinweis](#wichtiger-hinweis)
- [Mitwirken](#mitwirken)
- [Lizenz](#lizenz)

## Funktionen

- Material-Management und LCA-Berechnungen
- KBOB-Materialdatenbank-Integration über [lcadata.ch](https://www.lcadata.ch/)
- Interaktive Visualisierung der LCA-Ergebnisse
- Umfassende Materialdatenbank mit Umweltauswirkungsdaten
- Export-Funktionen für Excel, CSV und JSON

## Kontext

Diese UI arbeitet in Verbindung mit dem [NHMzh Modules](https://github.com/LTplus-AG/LCA-Cost-NHMzh) Backend-System, das folgende Funktionen bietet:

- LCA-Berechnungen
- Kostenberechnungen
- Datenverarbeitung
- Ergebnisgenerierung

## Erste Schritte

Zuerst den Entwicklungsserver starten:

```bash
npm run dev
# oder
yarn dev
# oder
pnpm dev
```

Öffne [http://localhost:5173](http://localhost:5173) im Browser, um das Ergebnis zu sehen.

## Projektstruktur

```
app/
├── components/
│   └── ui/
├── data/
├── lib/
├── services/
├── types/
└── utils/
```

## Umgebungsvariablen

Erstelle eine `.env.local` Datei im Hauptverzeichnis mit:

```
IFC_API_KEY=ihr_api_schlüssel
```

Der API-Schlüssel kann über [lcadata.ch](https://www.lcadata.ch/) bezogen werden.

## Technologie-Stack

- [React 18](https://reactjs.org/) - UI-Bibliothek
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [TypeScript](https://www.typescriptlang.org/) - Typsicherheit
- [Radix UI](https://www.radix-ui.com/) - Barrierefreie Komponenten
- [Vite](https://vitejs.dev/) - Build-Tool

## API-Integration

Die Anwendung integriert sich mit:

- [KBOB-Materialdatenbank-API](https://www.lcadata.ch/) für Umweltauswirkungsdaten von Materialien:
  - Umfangreiche Datenbank von Baumaterialien
  - Umweltauswirkungsdaten aus KBOB
  - Herstellerspezifische Daten
  - Historische Datenvergleiche
- NHMzh Modules Backend für LCA- und Kostenberechnungen

## Wichtiger Hinweis

Die Umweltauswirkungsdaten stammen aus den öffentlichen Daten der KBOB (Koordinationskonferenz der Bau- und Liegenschaftsorgane der öffentlichen Bauherren). Diese Daten dienen als Referenz und sollten für kritische Anwendungen mit Primärquellen verifiziert werden.

## Mitwirken

Pull Requests sind willkommen. Für grössere Änderungen erstellen Sie bitte zuerst ein Issue, um die gewünschten Änderungen zu besprechen.

## Lizenz

Dieses Projekt ist unter der GNU Affero General Public License v3.0 (AGPL-3.0) lizenziert - siehe unten für Details.

### GNU Affero General Public License v3.0

Dieses Programm ist freie Software: Sie können es unter den Bedingungen der GNU Affero General Public License, wie von der Free Software Foundation veröffentlicht, weitergeben und/oder modifizieren, entweder in Version 3 der Lizenz oder (nach Ihrer Wahl) einer späteren Version.

Dieses Programm wird in der Hoffnung bereitgestellt, dass es nützlich sein wird, jedoch OHNE JEDE GEWÄHRLEISTUNG; auch ohne die implizite Gewährleistung der MARKTFÄHIGKEIT oder EIGNUNG FÜR EINEN BESTIMMTEN ZWECK. Siehe die GNU Affero General Public License für weitere Details.

Sie sollten eine Kopie der GNU Affero General Public License zusammen mit diesem Programm erhalten haben. Wenn nicht, siehe <https://www.gnu.org/licenses/agpl-3.0.html>.
