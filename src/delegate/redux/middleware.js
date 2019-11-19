import { waitForState } from '../../utils/redux/waitForState'
import { getConnectedDelegateContract } from '../../delegateFactory/redux/selectors'
import { trackSwapAuthorizeSender } from '../../swap/redux/eventTrackingActions'
import { getConnectedWalletAddress } from '../../wallet/redux/reducers'
import { fetchSwapSenderAuthorizations } from '../../swap/redux/contractFunctionActions'
import { trackDelegateSetRule, trackDelegateUnsetRule } from './eventTrackingActions'
import { fetchDelegateRules } from './contractFunctionActions'
import { DELEGATE_FACTORY_CONTRACT_DEPLOY_BLOCK } from '../../constants'
import { getDelegateRules } from './callDataSelectors'

async function waitForDelegateContract(store) {
  return store.dispatch(
    waitForState({
      selector: state => !!getConnectedDelegateContract(state),
      result: true,
    }),
  )
}

export default function delegateMiddleware(store) {
  return next => action => {
    console.log(getDelegateRules(store.getState()))
    switch (action.type) {
      case 'REDUX_STORAGE_LOAD':
        next(action)
        waitForDelegateContract(store).then(() => {
          // as soon as a delegate contract is found for the connected address, invoke the following listeners:
          const state = store.getState()
          const walletAddress = getConnectedWalletAddress(state)
          const delegateAddress = getConnectedDelegateContract(state)

          // listen to swap sender authorizations for the delegate and update the state accordingly
          store.dispatch(
            trackSwapAuthorizeSender({
              authorizerAddress: walletAddress,
              authorizedSender: delegateAddress,
              fromBlock: DELEGATE_FACTORY_CONTRACT_DEPLOY_BLOCK,
              callback: () =>
                store.dispatch(
                  fetchSwapSenderAuthorizations({
                    authorizerAddress: walletAddress,
                    authorizedSender: delegateAddress,
                  }),
                ),
            }),
          )
          // listen to rule creation on the delegate and update the contract accordingly
          store.dispatch(
            trackDelegateSetRule({
              ruleOwner: walletAddress,
              fromBlock: DELEGATE_FACTORY_CONTRACT_DEPLOY_BLOCK,
              callback: events => {
                events.map(({ values: { senderToken, signerToken } }) => {
                  store.dispatch(
                    fetchDelegateRules({
                      senderToken,
                      signerToken,
                      contractAddress: delegateAddress,
                    }),
                  )
                })
              },
            }),
          )
          // listen to rule delegation on the delegate and update the contract accordingly
          store.dispatch(
            trackDelegateUnsetRule({
              ruleOwner: walletAddress,
              callback: events =>
                events.map(({ values: { senderToken, signerToken } }) => {
                  store.dispatch(
                    fetchDelegateRules({
                      senderToken,
                      signerToken,
                      contractAddress: delegateAddress,
                    }),
                  )
                }),
            }),
          )
        })
        break
      default:
        next(action)
    }
  }
}
