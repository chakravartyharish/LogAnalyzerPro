from abc import ABC, abstractmethod

from backend.constants import HYDRA_VISION_PERSONALITY_NAME, HYDRA_SCOPE_PERSONALITY_NAME


class BasePersonality(ABC):
    @property
    def name(self):
        return self.get_name()

    @abstractmethod
    def get_name(self):
        pass


class HydraScopePersonality(BasePersonality):
    def get_name(self):
        return HYDRA_SCOPE_PERSONALITY_NAME


class HydraVisionPersonality(BasePersonality):
    def get_name(self):
        return HYDRA_VISION_PERSONALITY_NAME
