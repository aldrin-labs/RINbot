import { onboardingSectionsMenuId } from '../../../chains/help/onboarding/config';
import { onboardingRootNode } from '../../../chains/help/onboarding/structure';
import { getOnboardingMenuByNodes } from '../../../chains/help/onboarding/utils';

const onboardingSectionsMenu = getOnboardingMenuByNodes({
  menuId: onboardingSectionsMenuId,
  nodes: onboardingRootNode,
});

export default onboardingSectionsMenu;
