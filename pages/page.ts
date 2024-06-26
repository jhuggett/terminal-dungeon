import { BunShell } from "@jhuggett/terminal";
import { Element } from "@jhuggett/terminal/elements/element";
export abstract class Page<TProps> {
  constructor(
    public root: Element<any>,
    public shell: BunShell,
    public props: TProps
  ) {}

  private pushPage?: Page<any> | null;
  private replacePage?: Page<any> | null;
  push(page: Page<any>) {
    this.pushPage = page;
    this.pageChangedResolver?.();
  }
  pop() {
    this.pushPage = null;
    this.pageChangedResolver?.();
  }
  replace(page: Page<any>) {
    this.replacePage = page;
    this.pageChangedResolver?.();
  }

  pageChangedResolver?: () => void;

  abstract beforeSetup(): void;

  private setup() {
    this.beforeSetup();
  }

  private teardown(): void {
    this.root.destroy();
    this.root.clearThisAndEverythingAbove();
  }

  async serve() {
    this.setup();

    while (this.pushPage !== null) {
      if (this.pushPage) {
        this.teardown();
        await this.pushPage.serve();
        this.pushPage = undefined;
        this.setup();
      } else if (this.replacePage) {
        this.teardown();
        await this.replacePage.serve();
        this.replacePage = undefined;
        return;
      }

      this.shell.render();

      const { promise: pageChanged, resolve: pageChangedResolver } =
        Promise.withResolvers();

      this.pageChangedResolver = pageChangedResolver;

      await Promise.race([this.shell.userInteraction(), pageChanged]);
    }

    this.teardown();
  }
}
