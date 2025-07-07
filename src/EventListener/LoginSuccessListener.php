<?php
namespace App\EventListener;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Security\Http\Event\LoginSuccessEvent;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

class LoginSuccessListener implements EventSubscriberInterface
{
    public function __construct(
        private RouterInterface $router,
        private TokenStorageInterface $tokenStorage,
        private RequestStack $requestStack
    ) {}

    public static function getSubscribedEvents(): array
    {
        return [
            LoginSuccessEvent::class => 'onLoginSuccess',
        ];
    }

    public function onLoginSuccess(LoginSuccessEvent $event): void
    {
        $user = $event->getUser();
        
        // Vérifier si l'utilisateur a le rôle ROLE_ACCESS
        if (!in_array('ROLE_ACCESS', $user->getRoles())) {
            // Déconnecter l'utilisateur
            $this->tokenStorage->setToken(null);
            
            // Obtenir la session depuis la requête
            $request = $this->requestStack->getCurrentRequest();
            if ($request && $request->hasSession()) {
                $session = $request->getSession();
                $session->invalidate();
                
                // Créer une nouvelle session pour pouvoir ajouter le message flash
                $session = $request->getSession();
                $session->getFlashBag()->add('error', 'Votre compte n\'a pas encore été activé. Veuillez attendre qu\'un administrateur vous donne l\'accès.');
            }
            
            // Rediriger vers la page de connexion
            $response = new RedirectResponse($this->router->generate('app_login'));
            $event->setResponse($response);
        }
    }
}