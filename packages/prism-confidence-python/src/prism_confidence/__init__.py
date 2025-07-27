"""
Prism Confidence - Python implementation of confidence extraction library
"""

from .extractor import (
    ConfidenceExtractor,
    ConfidenceValue,
    ConfidenceResult,
    ConsistencyOptions,
    ResponseAnalysisOptions,
)

from .calibration import (
    DomainCalibrator,
    SecurityCalibrator,
    InteractiveCalibrator,
    TemporalCalibrator,
    CalibratorChain,
    CalibrationCurve,
    calculate_ece,
    get_reliability_diagram_data,
)

from .ensemble import (
    ConfidenceEnsemble,
    WeightedEnsemble,
    VotingEnsemble,
    BayesianEnsemble,
    EnsembleConfig,
    create_ensemble,
    ensemble_combine,
    EnsembleMethod,
)

from .patterns import (
    ConfidenceBudgetManager,
    ConfidenceContractManager,
    DifferentialConfidenceManager,
    TemporalConfidence,
    ConfidenceThreshold,
    ConfidenceGate,
    ConfidenceAggregator,
    ConfidenceContract,
    PatternMatcher,
    Pattern,
)

__version__ = "0.1.0"

__all__ = [
    # Extractor
    "ConfidenceExtractor",
    "ConfidenceValue",
    "ConfidenceResult",
    "ConsistencyOptions",
    "ResponseAnalysisOptions",
    # Calibration
    "DomainCalibrator",
    "SecurityCalibrator", 
    "InteractiveCalibrator",
    "TemporalCalibrator",
    "CalibratorChain",
    "CalibrationCurve",
    "calculate_ece",
    "get_reliability_diagram_data",
    # Ensemble
    "ConfidenceEnsemble",
    "WeightedEnsemble",
    "VotingEnsemble",
    "BayesianEnsemble",
    "EnsembleConfig",
    "create_ensemble",
    "ensemble_combine",
    "EnsembleMethod",
    # Patterns
    "ConfidenceBudgetManager",
    "ConfidenceContractManager",
    "DifferentialConfidenceManager",
    "TemporalConfidence",
    "ConfidenceThreshold",
    "ConfidenceGate",
    "ConfidenceAggregator",
    "ConfidenceContract",
    "PatternMatcher",
    "Pattern",
]