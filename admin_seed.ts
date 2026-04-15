import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Tip } from './types';

const mockTips: Partial<Tip>[] = [
  // Football (10)
  {
    sport: 'Football',
    league: 'Premier League',
    home: 'Manchester United',
    away: 'Chelsea',
    date: Timestamp.fromDate(new Date()),
    tip: 'Over 2.5 Goals',
    odds: 1.85,
    confidence: 82,
    reasoning: 'Both teams have shown defensive vulnerabilities recently while maintaining strong attacking output. Expect a high-scoring affair at Old Trafford.',
    expected_value: 1.15,
    image_url: 'https://picsum.photos/seed/football1/400/200',
    isHot: true
  },
  {
    sport: 'Football',
    league: 'La Liga',
    home: 'Real Madrid',
    away: 'Barcelona',
    date: Timestamp.fromDate(new Date()),
    tip: 'BTTS Yes',
    odds: 1.65,
    confidence: 88,
    reasoning: 'El Clasico rarely disappoints. Both sides are in peak scoring form with Vinicius and Lewandowski leading their respective lines.',
    expected_value: 1.08,
    image_url: 'https://picsum.photos/seed/football2/400/200',
    isHot: true
  },
  {
    sport: 'Football',
    league: 'Premier League',
    home: 'Liverpool',
    away: 'Arsenal',
    date: Timestamp.fromDate(new Date()),
    tip: 'Under 2.5 Goals',
    odds: 2.10,
    confidence: 74,
    reasoning: 'Tactical battle expected. Both managers will prioritize defensive stability in this top-of-the-table clash.',
    expected_value: 1.25,
    image_url: 'https://picsum.photos/seed/football3/400/200'
  },
  // ... adding more football
  { sport: 'Football', league: 'Serie A', home: 'Inter Milan', away: 'AC Milan', date: Timestamp.fromDate(new Date()), tip: 'Home Win', odds: 1.95, confidence: 78, reasoning: 'Inter has dominated the recent derbies and looks more balanced.', expected_value: 1.12, image_url: 'https://picsum.photos/seed/football4/400/200' },
  { sport: 'Football', league: 'Bundesliga', home: 'Bayern Munich', away: 'Dortmund', date: Timestamp.fromDate(new Date()), tip: 'Over 3.5 Goals', odds: 2.25, confidence: 70, reasoning: 'Der Klassiker is always a goal fest. High lines from both teams.', expected_value: 1.30, image_url: 'https://picsum.photos/seed/football5/400/200' },
  { sport: 'Football', league: 'Ligue 1', home: 'PSG', away: 'Marseille', date: Timestamp.fromDate(new Date()), tip: 'Home Win -1.5', odds: 2.05, confidence: 85, reasoning: 'PSG quality at home is too much for Marseille to handle.', expected_value: 1.18, image_url: 'https://picsum.photos/seed/football6/400/200' },
  { sport: 'Football', league: 'Champions League', home: 'Man City', away: 'Real Madrid', date: Timestamp.fromDate(new Date()), tip: 'Home Win', odds: 1.75, confidence: 90, reasoning: 'City at the Etihad are nearly invincible in Europe.', expected_value: 1.05, image_url: 'https://picsum.photos/seed/football7/400/200', isHot: true },
  { sport: 'Football', league: 'Europa League', home: 'Ajax', away: 'Roma', date: Timestamp.fromDate(new Date()), tip: 'Draw', odds: 3.40, confidence: 68, reasoning: 'Two evenly matched sides likely to cancel each other out.', expected_value: 1.45, image_url: 'https://picsum.photos/seed/football8/400/200' },
  { sport: 'Football', league: 'Premier League', home: 'Tottenham', away: 'Aston Villa', date: Timestamp.fromDate(new Date()), tip: 'Over 2.5 Goals', odds: 1.70, confidence: 80, reasoning: 'Both teams play high-tempo football with defensive gaps.', expected_value: 1.10, image_url: 'https://picsum.photos/seed/football9/400/200' },
  { sport: 'Football', league: 'La Liga', home: 'Atletico Madrid', away: 'Sevilla', date: Timestamp.fromDate(new Date()), tip: 'Home Win', odds: 1.80, confidence: 84, reasoning: 'Simeone’s men are rock solid at the Metropolitano.', expected_value: 1.09, image_url: 'https://picsum.photos/seed/football10/400/200' },

  // Basketball (6)
  {
    sport: 'Basketball',
    league: 'NBA',
    home: 'LA Lakers',
    away: 'Golden State Warriors',
    date: Timestamp.fromDate(new Date()),
    tip: 'Over 225.5 Points',
    odds: 1.90,
    confidence: 76,
    reasoning: 'Both teams have high-octane offenses and struggle with perimeter defense.',
    expected_value: 1.14,
    image_url: 'https://picsum.photos/seed/bball1/400/200'
  },
  { sport: 'Basketball', league: 'NBA', home: 'Boston Celtics', away: 'Milwaukee Bucks', date: Timestamp.fromDate(new Date()), tip: 'Home Win', odds: 1.72, confidence: 86, reasoning: 'Celtics home record is the best in the league.', expected_value: 1.06, image_url: 'https://picsum.photos/seed/bball2/400/200' },
  { sport: 'Basketball', league: 'EuroLeague', home: 'Real Madrid', away: 'Panathinaikos', date: Timestamp.fromDate(new Date()), tip: 'Home Win', odds: 1.60, confidence: 89, reasoning: 'Madrid dominance in EuroLeague is consistent.', expected_value: 1.04, image_url: 'https://picsum.photos/seed/bball3/400/200' },
  { sport: 'Basketball', league: 'NBA', home: 'Denver Nuggets', away: 'Phoenix Suns', date: Timestamp.fromDate(new Date()), tip: 'Jokic Over 25.5 Pts', odds: 1.88, confidence: 82, reasoning: 'Jokic thrives in high-stakes matchups against the Suns.', expected_value: 1.11, image_url: 'https://picsum.photos/seed/bball4/400/200' },
  { sport: 'Basketball', league: 'NBA', home: 'Miami Heat', away: 'NY Knicks', date: Timestamp.fromDate(new Date()), tip: 'Under 210.5 Points', odds: 1.95, confidence: 72, reasoning: 'Gritty defensive battle expected between these rivals.', expected_value: 1.20, image_url: 'https://picsum.photos/seed/bball5/400/200' },
  { sport: 'Basketball', league: 'NBA', home: 'Dallas Mavericks', away: 'OKC Thunder', date: Timestamp.fromDate(new Date()), tip: 'Away Win', odds: 2.15, confidence: 70, reasoning: 'OKC young core matches up well against Luka’s Mavs.', expected_value: 1.28, image_url: 'https://picsum.photos/seed/bball6/400/200' },

  // Tennis (5)
  {
    sport: 'Tennis',
    league: 'Wimbledon',
    home: 'Carlos Alcaraz',
    away: 'Novak Djokovic',
    date: Timestamp.fromDate(new Date()),
    tip: 'Over 3.5 Sets',
    odds: 1.55,
    confidence: 92,
    reasoning: 'A battle of titans. Unlikely to be a straight-sets victory for either.',
    expected_value: 1.03,
    image_url: 'https://picsum.photos/seed/tennis1/400/200',
    isHot: true
  },
  { sport: 'Tennis', league: 'French Open', home: 'Iga Swiatek', away: 'Aryna Sabalenka', date: Timestamp.fromDate(new Date()), tip: 'Home Win', odds: 1.45, confidence: 91, reasoning: 'Swiatek on clay is nearly unbeatable.', expected_value: 1.02, image_url: 'https://picsum.photos/seed/tennis2/400/200' },
  { sport: 'Tennis', league: 'US Open', home: 'Jannik Sinner', away: 'Daniil Medvedev', date: Timestamp.fromDate(new Date()), tip: 'Sinner Win', odds: 1.68, confidence: 85, reasoning: 'Sinner’s hard court form is superior right now.', expected_value: 1.07, image_url: 'https://picsum.photos/seed/tennis3/400/200' },
  { sport: 'Tennis', league: 'ATP Finals', home: 'Alexander Zverev', away: 'Taylor Fritz', date: Timestamp.fromDate(new Date()), tip: 'Over 22.5 Games', odds: 1.80, confidence: 78, reasoning: 'Two big servers likely to go to tiebreaks.', expected_value: 1.13, image_url: 'https://picsum.photos/seed/tennis4/400/200' },
  { sport: 'Tennis', league: 'WTA Finals', home: 'Coco Gauff', away: 'Elena Rybakina', date: Timestamp.fromDate(new Date()), tip: 'Gauff Win', odds: 2.10, confidence: 72, reasoning: 'Gauff’s mobility will be key against Rybakina’s power.', expected_value: 1.22, image_url: 'https://picsum.photos/seed/tennis5/400/200' },

  // Cricket (4)
  {
    sport: 'Cricket',
    league: 'IPL',
    home: 'Mumbai Indians',
    away: 'CSK',
    date: Timestamp.fromDate(new Date()),
    tip: 'Home Win',
    odds: 1.80,
    confidence: 80,
    reasoning: 'Wankhede stadium favors the home side’s power hitters.',
    expected_value: 1.10,
    image_url: 'https://picsum.photos/seed/cricket1/400/200'
  },
  { sport: 'Cricket', league: 'T20 World Cup', home: 'India', away: 'Pakistan', date: Timestamp.fromDate(new Date()), tip: 'India Win', odds: 1.65, confidence: 87, reasoning: 'India’s depth in batting gives them the edge in pressure situations.', expected_value: 1.08, image_url: 'https://picsum.photos/seed/cricket2/400/200', isHot: true },
  { sport: 'Cricket', league: 'The Ashes', home: 'England', away: 'Australia', date: Timestamp.fromDate(new Date()), tip: 'Australia Win', odds: 2.20, confidence: 74, reasoning: 'Australia’s bowling attack is more consistent on this pitch.', expected_value: 1.24, image_url: 'https://picsum.photos/seed/cricket3/400/200' },
  { sport: 'Cricket', league: 'BBL', home: 'Perth Scorchers', away: 'Sydney Sixers', date: Timestamp.fromDate(new Date()), tip: 'Under 320.5 Total Runs', odds: 1.90, confidence: 75, reasoning: 'Slow pitch conditions expected to favor bowlers.', expected_value: 1.15, image_url: 'https://picsum.photos/seed/cricket4/400/200' }
];

export const seedTips = async () => {
  const tipsRef = collection(db, 'tips');
  try {
    for (const tip of mockTips) {
      await addDoc(tipsRef, tip);
    }
    console.log('Seeding complete!');
  } catch (error) {
    console.warn('Seeding failed: Likely missing permissions. This is expected if you are not logged in as an admin.', error);
  }
};
