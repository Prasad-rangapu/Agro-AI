
"""
Economic Analysis Module
Calculates profit, risk, and provides crop recommendations
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional

class EconomicAnalyzer:
    """Agricultural economic analysis and crop recommendation"""

    def __init__(self):
        # Default cost data (INR per hectare) - should be loaded from database
        self.default_costs = {
            'wheat': {
                'seeds': 3000, 'fertilizers': 12000, 'pesticides': 2000,
                'labor': 18000, 'machinery': 8000, 'irrigation': 5000, 'other': 2000
            },
            'rice': {
                'seeds': 2500, 'fertilizers': 15000, 'pesticides': 3000,
                'labor': 22000, 'machinery': 6000, 'irrigation': 8000, 'other': 3500
            },
            'maize': {
                'seeds': 4000, 'fertilizers': 10000, 'pesticides': 2500,
                'labor': 15000, 'machinery': 7000, 'irrigation': 4000, 'other': 2500
            },
            'soybean': {
                'seeds': 3500, 'fertilizers': 8000, 'pesticides': 2000,
                'labor': 12000, 'machinery': 6000, 'irrigation': 3000, 'other': 2000
            },
            'cotton': {
                'seeds': 2000, 'fertilizers': 15000, 'pesticides': 8000,
                'labor': 25000, 'machinery': 8000, 'irrigation': 6000, 'other': 4000
            }
        }

    def calculate_crop_economics(self, crop_name: str, area_ha: float,
                                predicted_yield: float, predicted_price: float,
                                yield_uncertainty: float = 0, price_uncertainty: float = 0,
                                risk_weight: float = 0.3) -> Dict:
        """
        Calculate comprehensive economic analysis for a crop

        Parameters:
        crop_name: Name of crop
        area_ha: Farm area in hectares
        predicted_yield: Expected yield (kg/ha)
        predicted_price: Expected price (INR/kg)
        yield_uncertainty: Standard deviation of yield prediction
        price_uncertainty: Standard deviation of price prediction
        risk_weight: Weight for risk adjustment (0-1)

        Returns:
        dict: Complete economic analysis
        """

        # Get cost data
        cost_per_ha = self.default_costs.get(crop_name, self.default_costs['wheat'])
        total_cost_per_ha = sum(cost_per_ha.values())
        total_cost = total_cost_per_ha * area_ha

        # Calculate revenue
        total_yield = predicted_yield * area_ha
        expected_revenue = total_yield * predicted_price

        # Calculate profit
        expected_profit = expected_revenue - total_cost

        # Risk calculations
        if yield_uncertainty > 0:
            yield_cv = yield_uncertainty / predicted_yield
        else:
            yield_cv = 0.1  # Default 10% variability

        if price_uncertainty > 0:
            price_cv = price_uncertainty / predicted_price
        else:
            price_cv = 0.15  # Default 15% price variability

        # Combined risk score
        risk_score = yield_cv + price_cv

        # Risk-adjusted profit
        risk_penalty = risk_weight * risk_score * expected_revenue
        risk_adjusted_profit = expected_profit - risk_penalty

        # Profitability metrics
        profit_margin = (expected_profit / expected_revenue * 100) if expected_revenue > 0 else -100
        break_even_yield = total_cost / (area_ha * predicted_price) if predicted_price > 0 else float('inf')

        # Upfront costs (seeds, fertilizers, pesticides + 60% of labor)
        upfront_costs = (cost_per_ha['seeds'] + cost_per_ha['fertilizers'] + 
                        cost_per_ha['pesticides'] + cost_per_ha['labor'] * 0.6) * area_ha

        # Return on investment
        roi = (expected_profit / total_cost * 100) if total_cost > 0 else 0

        # Scenario analysis (optimistic/pessimistic)
        optimistic_yield = predicted_yield * (1 + yield_cv)
        pessimistic_yield = predicted_yield * (1 - yield_cv)
        optimistic_price = predicted_price * (1 + price_cv)
        pessimistic_price = predicted_price * (1 - price_cv)

        optimistic_profit = (optimistic_yield * area_ha * optimistic_price) - total_cost
        pessimistic_profit = (pessimistic_yield * area_ha * pessimistic_price) - total_cost

        return {
            'crop': crop_name,
            'area_ha': area_ha,
            'predicted_yield_kg_ha': predicted_yield,
            'predicted_price_per_kg': predicted_price,
            'total_yield_kg': total_yield,
            'expected_revenue': expected_revenue,
            'total_costs': total_cost,
            'cost_per_ha': total_cost_per_ha,
            'expected_profit': expected_profit,
            'risk_adjusted_profit': risk_adjusted_profit,
            'profit_margin_percent': profit_margin,
            'return_on_investment': roi,
            'break_even_yield_kg_ha': break_even_yield,
            'upfront_costs': upfront_costs,
            'risk_score': risk_score,
            'yield_cv': yield_cv,
            'price_cv': price_cv,
            'scenarios': {
                'optimistic_profit': optimistic_profit,
                'pessimistic_profit': pessimistic_profit
            },
            'cost_breakdown': cost_per_ha
        }

    def rank_crop_recommendations(self, economic_analyses: List[Dict], 
                                 farmer_budget: float) -> List[Dict]:
        """
        Rank crops by economic attractiveness and budget feasibility

        Parameters:
        economic_analyses: List of economic analysis results
        farmer_budget: Available budget for upfront costs

        Returns:
        list: Ranked crop recommendations
        """

        # Separate feasible and infeasible crops
        feasible_crops = []
        infeasible_crops = []

        for analysis in economic_analyses:
            analysis = analysis.copy()  # Don't modify original

            if analysis['upfront_costs'] <= farmer_budget:
                analysis['budget_feasible'] = True
                analysis['budget_utilization'] = analysis['upfront_costs'] / farmer_budget
                feasible_crops.append(analysis)
            else:
                analysis['budget_feasible'] = False
                analysis['budget_shortfall'] = analysis['upfront_costs'] - farmer_budget
                infeasible_crops.append(analysis)

        # Rank feasible crops by risk-adjusted profit per hectare
        feasible_crops.sort(
            key=lambda x: x['risk_adjusted_profit'] / x['area_ha'], 
            reverse=True
        )

        # Add ranking
        for i, crop in enumerate(feasible_crops):
            crop['rank'] = i + 1
            crop['recommendation_score'] = crop['risk_adjusted_profit'] / crop['area_ha']

        # Sort infeasible crops by profit potential
        infeasible_crops.sort(
            key=lambda x: x['expected_profit'] / x['area_ha'], 
            reverse=True
        )

        for crop in infeasible_crops:
            crop['rank'] = None
            crop['recommendation_score'] = 0

        return feasible_crops + infeasible_crops

    def generate_recommendations_text(self, ranked_crops: List[Dict]) -> List[str]:
        """Generate human-readable recommendations"""

        recommendations = []

        feasible_crops = [c for c in ranked_crops if c['budget_feasible']]

        if not feasible_crops:
            return ["No crops are feasible within the given budget. Consider increasing budget or reducing area."]

        # Top recommendation
        top_crop = feasible_crops[0]
        recommendations.append(
            f"🥇 TOP RECOMMENDATION: {top_crop['crop'].upper()}"
        )
        recommendations.append(
            f"Expected profit: ₹{top_crop['expected_profit']:,.0f} "
            f"(Margin: {top_crop['profit_margin_percent']:.1f}%)"
        )
        recommendations.append(
            f"Upfront investment: ₹{top_crop['upfront_costs']:,.0f}"
        )

        # Risk assessment
        if top_crop['risk_score'] < 0.2:
            risk_level = "LOW RISK"
        elif top_crop['risk_score'] < 0.4:
            risk_level = "MODERATE RISK"
        else:
            risk_level = "HIGH RISK"

        recommendations.append(f"Risk level: {risk_level}")

        # Alternative options
        if len(feasible_crops) > 1:
            recommendations.append("\nAlternative options:")
            for crop in feasible_crops[1:3]:  # Show up to 2 alternatives
                recommendations.append(
                    f"• {crop['crop'].title()}: ₹{crop['expected_profit']:,.0f} profit "
                    f"({crop['profit_margin_percent']:.1f}% margin)"
                )

        # Budget optimization
        budget_used = top_crop['budget_utilization']
        if budget_used < 0.7:
            recommendations.append(
                f"\n💡 You're using only {budget_used*100:.0f}% of your budget. "
                f"Consider expanding area or investing in higher-value crops."
            )

        return recommendations

    def sensitivity_analysis(self, base_analysis: Dict, 
                           price_change_pct: float = 10, 
                           yield_change_pct: float = 10) -> Dict:
        """Perform sensitivity analysis on price and yield changes"""

        base_yield = base_analysis['predicted_yield_kg_ha']
        base_price = base_analysis['predicted_price_per_kg']
        area_ha = base_analysis['area_ha']
        total_cost = base_analysis['total_costs']

        scenarios = {}

        # Price sensitivity
        for price_change in [-price_change_pct, 0, price_change_pct]:
            new_price = base_price * (1 + price_change/100)
            new_revenue = base_yield * area_ha * new_price
            new_profit = new_revenue - total_cost
            scenarios[f'price_{price_change:+d}pct'] = {
                'profit': new_profit,
                'margin': new_profit/new_revenue*100 if new_revenue > 0 else 0
            }

        # Yield sensitivity
        for yield_change in [-yield_change_pct, 0, yield_change_pct]:
            new_yield = base_yield * (1 + yield_change/100)
            new_revenue = new_yield * area_ha * base_price
            new_profit = new_revenue - total_cost
            scenarios[f'yield_{yield_change:+d}pct'] = {
                'profit': new_profit,
                'margin': new_profit/new_revenue*100 if new_revenue > 0 else 0
            }

        return scenarios

# Example usage
if __name__ == "__main__":
    analyzer = EconomicAnalyzer()

    # Example crop analysis
    crops_data = [
        {'crop': 'wheat', 'yield': 4500, 'price': 21.5},
        {'crop': 'rice', 'yield': 5200, 'price': 19.2},
        {'crop': 'maize', 'yield': 6800, 'price': 18.8}
    ]

    area_ha = 2.0
    farmer_budget = 80000

    analyses = []
    for crop_data in crops_data:
        analysis = analyzer.calculate_crop_economics(
            crop_data['crop'], area_ha, crop_data['yield'], crop_data['price']
        )
        analyses.append(analysis)

    # Get recommendations
    ranked = analyzer.rank_crop_recommendations(analyses, farmer_budget)
    recommendations = analyzer.generate_recommendations_text(ranked)

    print("\n".join(recommendations))
