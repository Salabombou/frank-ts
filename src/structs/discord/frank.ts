import { Client } from 'discord.js'
import { FrankUtils } from 'utils/frank'

export class Frank extends Client {
    public readonly utils = new FrankUtils(this)

    login() {
        return super
            .login(this.utils.config.FRANK_TOKEN)            
            .catch((error) => {
                throw error
            })
            .then(async (value) => {
                await this.utils.init()
                return value
            })
    }
}
