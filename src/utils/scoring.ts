export type Scores = {
	lezzet: number;
	malzeme: number;
	porsiyon: number;
	servis: number;
	ortam: number;
	fiyatPerformans: number;
};

export function calculateOverall(scores: Scores): number {
	// Ağırlıklı ortalama hesaplama:
	// lezzet: 0.35, malzeme: 0.15, porsiyon: 0.10, servis: 0.15, ortam: 0.10, fiyatPerformans: 0.15
	const weightedScore = 
		scores.lezzet * 0.35 +
		scores.malzeme * 0.15 +
		scores.porsiyon * 0.10 +
		scores.servis * 0.15 +
		scores.ortam * 0.10 +
		scores.fiyatPerformans * 0.15;
	
	// Virgülden sonra 1 haneye yuvarla
	return Math.round(weightedScore * 10) / 10;
}

export function toLetterGrade(score: number): string {
	if (score >= 9.7) return 'A+';
	if (score >= 9.3) return 'A';
	if (score >= 8.8) return 'A-';
	if (score >= 8.3) return 'B+';
	if (score >= 7.7) return 'B';
	if (score >= 7.0) return 'B-';
	if (score >= 6.0) return 'C';
	if (score >= 4.0) return 'D';
	return 'F';
}

export function getCategoryRecord(restaurants: any[], category: string): any {
	const categoryRestaurants = restaurants.filter((r) => r.data.category === category);
	if (categoryRestaurants.length === 0) return null;
	
	// Her restoran için overall skoru hesapla ve en yükseğini bul
	return categoryRestaurants.reduce((prev, current) => {
		const prevScore = calculateOverall(prev.data.scores);
		const currentScore = calculateOverall(current.data.scores);
		return currentScore > prevScore ? current : prev;
	});
}
