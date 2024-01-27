
const no_positions_text = "No open positions \n";

export default (router: any) => {

    const positions_route = router.route("positions");
    positions_route.use((ctx: any) => ctx.reply(no_positions_text));

    return router;
}