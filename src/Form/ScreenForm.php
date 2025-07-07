<?php
namespace App\Form;

use App\Entity\Screen;
use App\Entity\Group;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class ScreenForm extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Nom du screen',
                'required' => true,
            ])
            ->add('groupeScreen', EntityType::class, [
                'class' => Group::class,
                'choice_label' => 'name',
                'choice_attr' => function (Group $group) {
                    return [
                        'data-role' => $group->getRole(),
                        'title' => $group->getName() . ' - ' . $group->getRole()
                    ];
                },
                'label' => 'Groupe',
                'required' => true,
                'attr' => [
                    'class' => 'form-select group-select'
                ]
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Screen::class,
        ]);
    }
}