import { Client } from 'discord.js'
import { FrankUtils } from 'utils/frank'

export class Frank extends Client {
    public readonly utils = new FrankUtils(this)

    login(token?: string) {
        return super
            .login(token)
            .catch((error) => {
                throw error
            })
            .finally(() => this.utils.init())
    }
}
