export const useMockTradeData = () => {
	return {
		// 模拟积分
		buyerPoints: 1250.50,
		sellerPoints: 800.00,
		// 模拟商家列表
		merchants: [
			{ id: 1, address: "0xAbc...123", beneficiary: "0xTreasury...1", deposit: 1000, active: true },
			{ id: 2, address: "0xDef...456", beneficiary: "0xTreasury...2", deposit: 5000, active: true },
		],
		// 模拟治理提案
		proposals: [
			{ id: 1, title: "修改挑战窗口期为 3 天", status: "Active", forA: 80, forB: 40 }, // A支持高，B支持低
		]
	};
};